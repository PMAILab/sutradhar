/**
 * Temporary in-memory store, same stopgap as the frontend's PlanContext.
 * Swap for Supabase tables (vendors, messages) once that lands.
 */

export interface Vendor {
  id: string;
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

export const vendors: Vendor[] = [];
export const messages: Message[] = [];

let vendorCounter = 0;
let messageCounter = 0;

export function addVendor(input: { name: string; role: string; phoneNumber: string }): Vendor {
  vendorCounter += 1;
  const vendor: Vendor = {
    id: `vendor_${vendorCounter}`,
    name: input.name,
    role: input.role,
    phoneNumber: input.phoneNumber.replace(/[^0-9]/g, ""),
    createdAt: new Date().toISOString(),
  };
  vendors.push(vendor);
  return vendor;
}

export function getVendorById(id: string): Vendor | undefined {
  return vendors.find((v) => v.id === id);
}

export function findVendorByPhone(phoneNumber: string): Vendor | undefined {
  const normalized = phoneNumber.replace(/[^0-9]/g, "");
  return vendors.find((v) => v.phoneNumber === normalized);
}

export function addMessage(input: Omit<Message, "id" | "timestamp"> & { timestamp?: string }): Message {
  messageCounter += 1;
  const message: Message = {
    id: `message_${messageCounter}`,
    timestamp: input.timestamp ?? new Date().toISOString(),
    ...input,
  };
  messages.push(message);
  return message;
}

export function getMessagesForVendor(vendorId: string): Message[] {
  return messages
    .filter((m) => m.vendorId === vendorId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function findMessageByWaId(waMessageId: string): Message | undefined {
  return messages.find((m) => m.waMessageId === waMessageId);
}

const ESCALATION_HOURS = 48;

export type VendorStatus = "not_contacted" | "sent" | "confirmed" | "declined" | "needs_review" | "needs_attention";

export function computeVendorStatus(vendorId: string): VendorStatus {
  const history = getMessagesForVendor(vendorId);
  if (history.length === 0) return "not_contacted";

  const lastInbound = [...history].reverse().find((m) => m.direction === "inbound");
  const lastOutbound = [...history].reverse().find((m) => m.direction === "outbound");

  if (lastInbound && (!lastOutbound || new Date(lastInbound.timestamp) > new Date(lastOutbound.timestamp))) {
    return classifyReply(lastInbound.body);
  }

  if (lastOutbound) {
    if (lastOutbound.deliveryStatus === "failed") return "needs_attention";
    const hoursSinceSent = (Date.now() - new Date(lastOutbound.timestamp).getTime()) / (1000 * 60 * 60);
    return hoursSinceSent >= ESCALATION_HOURS ? "needs_attention" : "sent";
  }

  return "not_contacted";
}

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
