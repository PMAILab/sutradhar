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

export interface StructuredPlan {
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: Tradition | "unspecified";
  traditionConfidence: "high" | "medium" | "low";
  ceremonies: PlanCeremony[];
}

export interface Gap {
  id: string;
  ceremonyId: string;
  ceremonyName: string;
  label: string;
  reason: string;
  severity: "important" | "worth_checking";
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

export function parseIntake(rawText: string): Promise<{ plan: StructuredPlan }> {
  return request("/api/intake/parse", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

export function checkGaps(
  plan: StructuredPlan,
  dismissedGapIds: string[],
): Promise<{ gaps: Gap[]; note?: string }> {
  return request("/api/copilot/check-gaps", {
    method: "POST",
    body: JSON.stringify({ plan, dismissedGapIds }),
  });
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

export function listVendors(): Promise<{ vendors: Vendor[] }> {
  return request("/api/vendors");
}

export function addVendor(input: { name: string; role: string; phoneNumber: string }): Promise<{ vendor: Vendor }> {
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
