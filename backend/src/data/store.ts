import { randomUUID } from "node:crypto";
import { getSupabase } from "../lib/supabaseClient.js";

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  role: string;
  phoneNumber: string; // E.164 without the leading +, matches Meta's "to" format
  createdAt: string;
}

export type MessageDirection = "outbound" | "inbound";
export type DeliveryStatus = "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  vendorId: string;
  direction: MessageDirection;
  body: string;
  templateName?: string;
  waMessageId?: string;
  deliveryStatus?: DeliveryStatus;
  errorReason?: string;
  timestamp: string;
}

interface VendorRow {
  id: string;
  event_id: string;
  name: string;
  role: string | null;
  phone_number: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  vendor_id: string;
  direction: MessageDirection;
  body: string;
  template_name: string | null;
  wa_message_id: string | null;
  delivery_status: DeliveryStatus | null;
  error_reason: string | null;
  timestamp: string;
}

function mapVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    role: row.role ?? "",
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    direction: row.direction,
    body: row.body,
    templateName: row.template_name ?? undefined,
    waMessageId: row.wa_message_id ?? undefined,
    deliveryStatus: row.delivery_status ?? undefined,
    errorReason: row.error_reason ?? undefined,
    timestamp: row.timestamp,
  };
}

export async function addVendor(input: {
  eventId: string;
  name: string;
  role: string;
  phoneNumber: string;
}): Promise<Vendor> {
  const row = {
    id: randomUUID(),
    event_id: input.eventId,
    name: input.name,
    role: input.role,
    phone_number: input.phoneNumber.replace(/[^0-9]/g, ""),
  };
  const { data, error } = await getSupabase().from("vendors").insert(row).select().single();
  if (error) throw error;
  return mapVendor(data);
}

export async function getVendorById(id: string): Promise<Vendor | undefined> {
  const { data, error } = await getSupabase().from("vendors").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapVendor(data) : undefined;
}

export async function listVendors(eventId?: string): Promise<Vendor[]> {
  let query = getSupabase().from("vendors").select();
  if (eventId) query = query.eq("event_id", eventId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapVendor);
}

export async function getVendorsForEvent(eventId: string): Promise<Vendor[]> {
  return listVendors(eventId);
}

// Vendors don't carry planner_id directly, only via their event, so this
// filters through the events join (plus messages nested in the same query,
// 1 round trip total) — the unfiltered "all vendors" view and bulk-reminder,
// where an eventId isn't already known-and-verified to belong to the caller
// the way it is when getVendorsForEvent is called internally.
export async function getVendorStatusesForPlanner(
  plannerId: string,
  vendorFollowUpsEnabled: boolean,
  eventId?: string,
): Promise<VendorWithStatus[]> {
  let query = getSupabase()
    .from("vendors")
    .select("*, events!inner(planner_id), messages(*)")
    .eq("events.planner_id", plannerId);
  if (eventId) query = query.eq("event_id", eventId);
  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as (VendorRow & { messages: MessageRow[] })[]).map((row) => {
    const vendor = mapVendor(row);
    const history = (row.messages ?? [])
      .map(mapMessage)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return { vendor, status: deriveVendorStatus(history, vendorFollowUpsEnabled), history };
  });
}

// Used to resolve a "Call Venue Manager" action on Event Detail without a
// dedicated venue-contact column: a venue is just a vendor whose role or
// name mentions "venue", same table, same status pipeline.
export async function findVenueManagerVendor(eventId: string): Promise<Vendor | undefined> {
  const vendors = await listVendors(eventId);
  return vendors.find((v) => /venue/i.test(v.role) || /venue/i.test(v.name));
}

export async function findVendorByPhone(phoneNumber: string): Promise<Vendor | undefined> {
  const normalized = phoneNumber.replace(/[^0-9]/g, "");
  const { data, error } = await getSupabase().from("vendors").select().eq("phone_number", normalized).maybeSingle();
  if (error) throw error;
  return data ? mapVendor(data) : undefined;
}

export async function addMessage(input: Omit<Message, "id" | "timestamp"> & { timestamp?: string }): Promise<Message> {
  const row = {
    id: randomUUID(),
    vendor_id: input.vendorId,
    direction: input.direction,
    body: input.body,
    template_name: input.templateName ?? null,
    wa_message_id: input.waMessageId ?? null,
    delivery_status: input.deliveryStatus ?? null,
    error_reason: input.errorReason ?? null,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  const { data, error } = await getSupabase().from("messages").insert(row).select().single();
  if (error) throw error;
  return mapMessage(data);
}

export async function getMessagesForVendor(vendorId: string): Promise<Message[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select()
    .eq("vendor_id", vendorId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

// Single batched query for messages across many vendors, grouped by vendor
// id — instead of one `messages` query per vendor. Used anywhere a whole
// event's (or planner's) vendor statuses are computed at once.
export async function getMessagesForVendors(vendorIds: string[]): Promise<Map<string, Message[]>> {
  const byVendor = new Map<string, Message[]>();
  if (vendorIds.length === 0) return byVendor;
  const { data, error } = await getSupabase()
    .from("messages")
    .select()
    .in("vendor_id", vendorIds)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  for (const row of data ?? []) {
    const message = mapMessage(row);
    const existing = byVendor.get(message.vendorId);
    if (existing) existing.push(message);
    else byVendor.set(message.vendorId, [message]);
  }
  return byVendor;
}

export async function updateMessageDeliveryStatus(waMessageId: string, status: DeliveryStatus): Promise<void> {
  const { error } = await getSupabase().from("messages").update({ delivery_status: status }).eq("wa_message_id", waMessageId);
  if (error) throw error;
}

const ESCALATION_HOURS = 48;

export type VendorStatus = "not_contacted" | "sent" | "confirmed" | "declined" | "needs_review" | "needs_attention";

// Pure — no DB call — so any caller that already has a vendor's message
// history in hand (batched fetch, webhook payload, etc.) can derive status
// without re-querying. computeVendorStatus below is the single-vendor
// convenience wrapper around this for callers that don't have history yet.
function deriveVendorStatus(history: Message[], vendorFollowUpsEnabled: boolean): VendorStatus {
  if (history.length === 0) return "not_contacted";

  const lastInbound = [...history].reverse().find((m) => m.direction === "inbound");
  const lastOutbound = [...history].reverse().find((m) => m.direction === "outbound");

  if (lastInbound && (!lastOutbound || new Date(lastInbound.timestamp) > new Date(lastOutbound.timestamp))) {
    return classifyReply(lastInbound.body);
  }

  if (lastOutbound) {
    // A failed send always needs attention, that's an actual delivery
    // failure, not the "automatic escalation when a vendor goes
    // unresponsive" this toggle describes, so it's never gated off.
    if (lastOutbound.deliveryStatus === "failed") return "needs_attention";
    if (!vendorFollowUpsEnabled) return "sent";
    const hoursSinceSent = (Date.now() - new Date(lastOutbound.timestamp).getTime()) / (1000 * 60 * 60);
    return hoursSinceSent >= ESCALATION_HOURS ? "needs_attention" : "sent";
  }

  return "not_contacted";
}

// vendorFollowUpsEnabled defaults true so internal callers that don't have
// a planner profile handy (e.g. the WhatsApp webhook, which looks a vendor
// up by phone number, not by planner) get the same behavior as before this
// was gated. Only a caller that actually checked the planner's Settings
// toggle should pass false.
export async function computeVendorStatus(
  vendorId: string,
  options?: { vendorFollowUpsEnabled?: boolean },
): Promise<VendorStatus> {
  const history = await getMessagesForVendor(vendorId);
  return deriveVendorStatus(history, options?.vendorFollowUpsEnabled ?? true);
}

export interface VendorWithStatus {
  vendor: Vendor;
  status: VendorStatus;
  history: Message[];
}

// Computes status for a known list of vendors in exactly 1 query (all their
// messages, batched) instead of 1 `messages` query per vendor.
export async function getVendorStatuses(
  vendors: Vendor[],
  vendorFollowUpsEnabled: boolean,
): Promise<VendorWithStatus[]> {
  const messagesByVendor = await getMessagesForVendors(vendors.map((v) => v.id));
  return vendors.map((vendor) => {
    const history = messagesByVendor.get(vendor.id) ?? [];
    return { vendor, status: deriveVendorStatus(history, vendorFollowUpsEnabled), history };
  });
}

// Computes every vendor's status across a whole set of events in exactly 1
// query — vendors and their messages nested via the same FK-embed
// PostgREST already uses for events->ceremonies->tasks (see eventsStore.ts)
// — instead of one `vendors` query per event plus one `messages` query per
// vendor. This is what the dashboard and events-list summaries are built from.
export async function getVendorStatusesForEvents(
  eventIds: string[],
  vendorFollowUpsEnabled: boolean,
): Promise<Map<string, VendorWithStatus[]>> {
  const byEvent = new Map<string, VendorWithStatus[]>();
  if (eventIds.length === 0) return byEvent;

  const { data, error } = await getSupabase()
    .from("vendors")
    .select("*, messages(*)")
    .in("event_id", eventIds);
  if (error) throw error;

  for (const row of (data ?? []) as (VendorRow & { messages: MessageRow[] })[]) {
    const vendor = mapVendor(row);
    const history = (row.messages ?? [])
      .map(mapMessage)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const entry: VendorWithStatus = { vendor, status: deriveVendorStatus(history, vendorFollowUpsEnabled), history };
    const existing = byEvent.get(vendor.eventId);
    if (existing) existing.push(entry);
    else byEvent.set(vendor.eventId, [entry]);
  }
  return byEvent;
}

// In-memory on purpose: only dedupes escalation analytics events within a
// process lifetime, not data that needs to survive a restart.
const escalatedVendorIds = new Set<string>();

export function markEscalatedIfNew(vendorId: string): boolean {
  if (escalatedVendorIds.has(vendorId)) return false;
  escalatedVendorIds.add(vendorId);
  return true;
}

const CONFIRM_WORDS = ["yes", "confirmed", "confirm", "done", "sure", "haan", "ok", "okay", "sorted"];
const DECLINE_WORDS = ["no", "cannot", "can't", "cant", "unable", "sorry", "not possible", "won't"];

function classifyReply(body: string): "confirmed" | "declined" | "needs_review" {
  const normalized = body.trim().toLowerCase();
  if (CONFIRM_WORDS.some((word) => normalized.includes(word))) return "confirmed";
  if (DECLINE_WORDS.some((word) => normalized.includes(word))) return "declined";
  return "needs_review";
}
