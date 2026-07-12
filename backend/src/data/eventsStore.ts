import { randomUUID } from "node:crypto";
import type { StructuredPlan, PlanCeremony } from "../types/plan.js";
import { getSupabase } from "../lib/supabaseClient.js";

export interface EventVenue {
  name: string | null;
  address: string | null;
  capacity: number | null;
}

export interface EventDetails {
  city?: string | null;
  guestCount?: number | null;
  venue?: EventVenue;
}

export interface WeddingEvent extends StructuredPlan {
  id: string;
  createdAt: string;
  dismissedGapIds: string[];
  lastGapCount: number;
  completedAt: string | null;
  successful: boolean | null;
  city: string | null;
  guestCount: number | null;
  venue: EventVenue;
}

interface TaskRow {
  id: string;
  title: string;
  vendor: string | null;
  status: "pending" | "confirmed" | "needs_review";
}

interface CeremonyRow {
  id: string;
  name: string;
  notes: string | null;
  position: number;
  tasks: TaskRow[] | null;
}

interface ConflictRow {
  id: string;
  description: string;
  options: string[] | null;
  resolved: boolean;
  resolved_value: string | null;
}

interface EventRow {
  id: string;
  couple_names: string | null;
  wedding_date: string | null;
  tradition: string | null;
  tradition_confidence: string | null;
  city: string | null;
  guest_count: number | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_capacity: number | null;
  last_gap_count: number;
  dismissed_gap_ids: string[] | null;
  completed_at: string | null;
  successful: boolean | null;
  created_at: string;
  ceremonies: CeremonyRow[] | null;
  conflicts: ConflictRow[] | null;
}

const EVENT_SELECT = "*, ceremonies(*, tasks(*)), conflicts(*)";

function mapEvent(row: EventRow): WeddingEvent {
  const ceremonies = [...(row.ceremonies ?? [])].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    createdAt: row.created_at,
    dismissedGapIds: row.dismissed_gap_ids ?? [],
    lastGapCount: row.last_gap_count,
    completedAt: row.completed_at,
    successful: row.successful,
    coupleNames: row.couple_names,
    weddingDate: row.wedding_date,
    tradition: row.tradition ?? "unspecified",
    traditionConfidence: (row.tradition_confidence ?? "low") as StructuredPlan["traditionConfidence"],
    city: row.city,
    guestCount: row.guest_count,
    venue: {
      name: row.venue_name,
      address: row.venue_address,
      capacity: row.venue_capacity,
    },
    ceremonies: ceremonies.map((c) => ({
      id: c.id,
      name: c.name,
      notes: c.notes,
      tasks: (c.tasks ?? []).map((t) => ({ id: t.id, title: t.title, vendor: t.vendor, status: t.status })),
    })),
    conflicts: (row.conflicts ?? []).map((c) => ({
      id: c.id,
      description: c.description,
      options: c.options ?? [],
      resolved: c.resolved,
      resolvedValue: c.resolved_value,
    })),
  };
}

async function insertCeremonies(eventId: string, ceremonies: PlanCeremony[]): Promise<void> {
  if (ceremonies.length === 0) return;

  const ceremonyRows = ceremonies.map((ceremony, index) => ({
    id: ceremony.id,
    event_id: eventId,
    name: ceremony.name,
    notes: ceremony.notes,
    position: index,
  }));
  const { error: ceremonyError } = await getSupabase().from("ceremonies").insert(ceremonyRows);
  if (ceremonyError) throw ceremonyError;

  const taskRows = ceremonies.flatMap((ceremony) =>
    ceremony.tasks.map((task) => ({
      id: task.id,
      ceremony_id: ceremony.id,
      title: task.title,
      vendor: task.vendor,
      status: task.status,
    })),
  );
  if (taskRows.length > 0) {
    const { error: taskError } = await getSupabase().from("tasks").insert(taskRows);
    if (taskError) throw taskError;
  }
}

export async function addEvent(
  plan: StructuredPlan,
  plannerId: string,
  details?: EventDetails,
): Promise<WeddingEvent> {
  const id = randomUUID();
  const eventRow = {
    id,
    planner_id: plannerId,
    couple_names: plan.coupleNames,
    wedding_date: plan.weddingDate,
    tradition: plan.tradition,
    tradition_confidence: plan.traditionConfidence,
    city: details?.city ?? null,
    guest_count: details?.guestCount ?? null,
    venue_name: details?.venue?.name ?? null,
    venue_address: details?.venue?.address ?? null,
    venue_capacity: details?.venue?.capacity ?? null,
  };
  const { error: eventError } = await getSupabase().from("events").insert(eventRow);
  if (eventError) throw eventError;

  await insertCeremonies(id, plan.ceremonies);

  if (plan.conflicts.length > 0) {
    const conflictRows = plan.conflicts.map((conflict) => ({
      id: conflict.id,
      event_id: id,
      description: conflict.description,
      options: conflict.options,
      resolved: conflict.resolved,
      resolved_value: conflict.resolvedValue,
    }));
    const { error: conflictError } = await getSupabase().from("conflicts").insert(conflictRows);
    if (conflictError) throw conflictError;
  }

  const event = await getEventById(id);
  if (!event) throw new Error("Failed to read back the event that was just created.");
  return event;
}

export async function listEvents(plannerId: string): Promise<WeddingEvent[]> {
  const { data, error } = await getSupabase()
    .from("events")
    .select(EVENT_SELECT)
    .eq("planner_id", plannerId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

// plannerId, when passed, scopes the lookup so one planner can't fetch
// another planner's event by id. Omitted for internal lookups that already
// trust the id (e.g. reading back a row this same call just inserted).
export async function getEventById(id: string, plannerId?: string): Promise<WeddingEvent | undefined> {
  let query = getSupabase().from("events").select(EVENT_SELECT).eq("id", id);
  if (plannerId) query = query.eq("planner_id", plannerId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapEvent(data) : undefined;
}

export async function updateCeremonies(eventId: string, ceremonies: PlanCeremony[]): Promise<void> {
  const { error: deleteError } = await getSupabase().from("ceremonies").delete().eq("event_id", eventId);
  if (deleteError) throw deleteError;
  await insertCeremonies(eventId, ceremonies);
}

export async function setDismissedGapIds(eventId: string, ids: string[]): Promise<void> {
  const { error } = await getSupabase().from("events").update({ dismissed_gap_ids: ids }).eq("id", eventId);
  if (error) throw error;
}

export async function setLastGapCount(eventId: string, count: number): Promise<void> {
  const { error } = await getSupabase().from("events").update({ last_gap_count: count }).eq("id", eventId);
  if (error) throw error;
}

// planner_id is checked here, not just trusted from the caller, so one
// planner can never delete another's event by guessing an id. Ceremonies,
// tasks, vendors, messages, and conflicts all cascade via their FK's "on
// delete cascade" (schema.sql) — this one delete is enough.
export async function deleteEvent(eventId: string, plannerId: string): Promise<boolean> {
  const { error, count } = await getSupabase()
    .from("events")
    .delete({ count: "exact" })
    .eq("id", eventId)
    .eq("planner_id", plannerId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export interface UpdatableEventDetails {
  weddingDate?: string | null;
  city?: string | null;
  guestCount?: number | null;
  venue?: Partial<EventVenue>;
}

export async function updateEventDetails(
  eventId: string,
  plannerId: string,
  details: UpdatableEventDetails,
): Promise<WeddingEvent | undefined> {
  const patch: Record<string, unknown> = {};
  if ("weddingDate" in details) patch.wedding_date = details.weddingDate;
  if ("city" in details) patch.city = details.city;
  if ("guestCount" in details) patch.guest_count = details.guestCount;
  if (details.venue && "name" in details.venue) patch.venue_name = details.venue.name;
  if (details.venue && "address" in details.venue) patch.venue_address = details.venue.address;
  if (details.venue && "capacity" in details.venue) patch.venue_capacity = details.venue.capacity;

  if (Object.keys(patch).length === 0) return getEventById(eventId, plannerId);

  const { error, count } = await getSupabase()
    .from("events")
    .update(patch, { count: "exact" })
    .eq("id", eventId)
    .eq("planner_id", plannerId);
  if (error) throw error;
  if (!count) return undefined;
  return getEventById(eventId, plannerId);
}

export async function markEventSuccessful(eventId: string, successful: boolean): Promise<WeddingEvent | undefined> {
  const { error } = await getSupabase()
    .from("events")
    .update({ completed_at: new Date().toISOString(), successful })
    .eq("id", eventId);
  if (error) throw error;
  return getEventById(eventId);
}

export async function resolveConflict(
  eventId: string,
  conflictId: string,
  resolvedValue: string,
): Promise<WeddingEvent | undefined> {
  const { error } = await getSupabase()
    .from("conflicts")
    .update({ resolved: true, resolved_value: resolvedValue })
    .eq("id", conflictId)
    .eq("event_id", eventId);
  if (error) throw error;
  return getEventById(eventId);
}

export function planTaskProgress(event: WeddingEvent): { confirmed: number; total: number } {
  let confirmed = 0;
  let total = 0;
  for (const ceremony of event.ceremonies) {
    for (const task of ceremony.tasks) {
      total += 1;
      if (task.status === "confirmed") confirmed += 1;
    }
  }
  return { confirmed, total };
}
