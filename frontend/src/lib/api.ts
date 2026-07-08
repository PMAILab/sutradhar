const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface PlanTask {
  id: string;
  title: string;
  vendor: string | null;
  status: "pending" | "confirmed" | "needs_review";
}

export interface PlanCeremony {
  id: string;
  name: string;
  tasks: PlanTask[];
  notes: string | null;
}

export type Tradition = "hindu_north_indian" | "muslim_nikah" | "sikh_anand_karaj";

export interface PlanConflict {
  id: string;
  description: string;
  options: string[];
  resolved: boolean;
  resolvedValue: string | null;
}

export interface StructuredPlan {
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: Tradition | "unspecified";
  traditionConfidence: "high" | "medium" | "low";
  ceremonies: PlanCeremony[];
  conflicts: PlanConflict[];
}

export interface WeddingEvent extends StructuredPlan {
  id: string;
  createdAt: string;
  dismissedGapIds: string[];
  lastGapCount: number;
  completedAt: string | null;
  successful: boolean | null;
}

export interface EventSummary {
  id: string;
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: Tradition | "unspecified";
  progress: { confirmed: number; total: number };
  vendorSummary: { total: number; confirmed: number; needsAttention: number };
  lastGapCount: number;
  successful?: boolean | null;
}

export interface Gap {
  id: string;
  ceremonyId: string;
  ceremonyName: string;
  label: string;
  reason: string;
  severity: "important" | "worth_checking";
  kbVersion: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Something went wrong" }));
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function parseIntake(rawText: string): Promise<{ event: WeddingEvent }> {
  return request("/api/intake/parse", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

export function listEvents(): Promise<{ events: EventSummary[] }> {
  return request("/api/events");
}

export function getEvent(eventId: string): Promise<{ event: WeddingEvent }> {
  return request(`/api/events/${eventId}`);
}

export function addTaskToCeremony(
  eventId: string,
  ceremonyId: string,
  title: string,
): Promise<{ event: WeddingEvent }> {
  return request(`/api/events/${eventId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ ceremonyId, title }),
  });
}

export function updateTaskStatus(
  eventId: string,
  taskId: string,
  ceremonyId: string,
  status: PlanTask["status"],
): Promise<{ event: WeddingEvent }> {
  return request(`/api/events/${eventId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ ceremonyId, status }),
  });
}

export function dismissGapApi(eventId: string, gapId: string): Promise<{ event: WeddingEvent }> {
  return request(`/api/events/${eventId}/dismiss-gap`, {
    method: "POST",
    body: JSON.stringify({ gapId }),
  });
}

export function resolveConflict(
  eventId: string,
  conflictId: string,
  resolvedValue: string,
): Promise<{ event: WeddingEvent }> {
  return request(`/api/events/${eventId}/resolve-conflict`, {
    method: "POST",
    body: JSON.stringify({ conflictId, resolvedValue }),
  });
}

export interface MarkSuccessfulWarning {
  warning: true;
  message: string;
  problemVendors: { id: string; name: string; role: string; status: string }[];
  unresolvedConflicts: { id: string; description: string }[];
}

export type MarkSuccessfulResult = { event: WeddingEvent } | MarkSuccessfulWarning;

export async function markEventSuccessful(
  eventId: string,
  successful: boolean,
  acknowledgeIssues = false,
): Promise<MarkSuccessfulResult> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/mark-successful`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ successful, acknowledgeIssues }),
  });

  const body = await response.json();

  if (response.status === 409 && body.warning) {
    return body as MarkSuccessfulWarning;
  }
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  return body as { event: WeddingEvent };
}

export function checkGaps(eventId: string): Promise<{ gaps: Gap[]; note?: string; knowledgeBaseVersion?: string }> {
  return request("/api/copilot/check-gaps", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

export interface DashboardUrgentItem {
  id: string;
  eventId: string;
  coupleNames: string;
  category: string;
  label: string;
  tier: 1 | 2 | 3;
}

export function getDashboard(): Promise<{ urgentItems: DashboardUrgentItem[]; events: EventSummary[] }> {
  return request("/api/dashboard");
}

export type VendorStatus = "not_contacted" | "sent" | "confirmed" | "declined" | "needs_review" | "needs_attention";

export interface VendorMessage {
  id: string;
  vendorId: string;
  direction: "outbound" | "inbound";
  body: string;
  templateName?: string;
  deliveryStatus?: "sent" | "delivered" | "read" | "failed";
  errorReason?: string;
  timestamp: string;
}

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  role: string;
  phoneNumber: string;
  createdAt: string;
  status: VendorStatus;
  lastMessage: VendorMessage | null;
}

export interface MessageTemplateDef {
  name: string;
  languageCode: string;
  paramLabels: string[];
}

export function listVendors(eventId?: string): Promise<{ vendors: Vendor[] }> {
  const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
  return request(`/api/vendors${query}`);
}

export function addVendor(input: {
  eventId: string;
  name: string;
  role: string;
  phoneNumber: string;
}): Promise<{ vendor: Vendor }> {
  return request("/api/vendors", { method: "POST", body: JSON.stringify(input) });
}

export function getVendorMessages(vendorId: string): Promise<{ messages: VendorMessage[] }> {
  return request(`/api/vendors/${vendorId}/messages`);
}

export function getMessageTemplates(): Promise<{ templates: Record<string, MessageTemplateDef> }> {
  return request("/api/vendors/templates");
}

export function sendVendorMessage(
  vendorId: string,
  templateName: string,
  params: string[],
): Promise<{ message: VendorMessage; status: VendorStatus }> {
  return request(`/api/vendors/${vendorId}/send`, {
    method: "POST",
    body: JSON.stringify({ templateName, params }),
  });
}

export function trackAnalyticsEvent(name: string, properties: Record<string, unknown> = {}): void {
  request("/api/analytics/track", {
    method: "POST",
    body: JSON.stringify({ name, properties }),
  }).catch(() => {
    // Analytics failures should never interrupt the planner's flow.
  });
}
