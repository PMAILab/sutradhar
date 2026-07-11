import * as mock from "./mockStore";
import { isMockMode } from "./mockStore";

// Always relative ("/api/...") on purpose — never set VITE_API_BASE_URL.
// Dev: Vite's server.proxy (vite.config.ts) forwards /api/* to the backend.
// Prod: Netlify's /api/* redirect (netlify.toml) forwards it to Render,
// server-to-server. Either way the browser only ever talks to one origin,
// so the session cookie stays first-party — a literal cross-origin
// VITE_API_BASE_URL would defeat that (see netlify.toml's comment).
const API_BASE_URL = "";

/** Aborts when any input signal aborts (including one that's already
 *  aborted at call time) — lets a caller-supplied signal and a timeout race
 *  each other without either one clobbering the other. */
function combineSignals(...signals: (AbortSignal | null | undefined)[]): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => Boolean(s));
  if (present.length === 0) return undefined;
  const controller = new AbortController();
  for (const s of present) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

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

export interface EventVenue {
  name: string | null;
  address: string | null;
  capacity: number | null;
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

export interface EventSummary {
  id: string;
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: Tradition | "unspecified";
  city?: string | null;
  guestCount?: number | null;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOnce<T>(path: string, options: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs, signal, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    // Sends/receives the httpOnly session cookie the backend sets — the
    // frontend never holds a Supabase key or token itself, only this
    // cookie, same origin or not (see backend CORS: credentials: true).
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...rest.headers,
    },
    signal: combineSignals(signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Something went wrong" }));
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  // 204 No Content (e.g. DELETE) has no body — .json() would throw on the
  // empty string.
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

/** A Render free-tier backend can take 30-50s to wake from idle — the first
 *  request after a quiet period fails with a plain network error (not an
 *  HTTP status, `fetch` itself rejects) before the dyno is up. One retry
 *  after a short pause turns that into "briefly slower" instead of a hard
 *  failure. Only retries actual network failures (TypeError from fetch, or
 *  our own timeout), never a real HTTP error response — a 400/404/500 is a
 *  real answer from a server that's already awake, retrying it just repeats
 *  the same mistake. */
async function request<T>(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  try {
    return await requestOnce<T>(path, options ?? {});
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    const isNetworkFailure = error instanceof TypeError || isAbort;
    if (!isNetworkFailure || options?.signal?.aborted) throw error;

    await sleep(1500);
    try {
      return await requestOnce<T>(path, options ?? {});
    } catch {
      throw new Error("Could not reach the server, it may be waking up from idle. Try again in a few seconds.");
    }
  }
}

export function parseIntake(rawText: string): Promise<{ event: WeddingEvent; fallback: boolean }> {
  if (isMockMode()) return Promise.resolve(mock.mockParseIntake(rawText));
  return request("/api/intake/parse", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

export function listEvents(): Promise<{ events: EventSummary[] }> {
  if (isMockMode()) return Promise.resolve(mock.mockListEvents());
  return request("/api/events");
}

export function getEvent(eventId: string): Promise<{ event: WeddingEvent; venueManagerPhone: string | null }> {
  if (isMockMode()) return Promise.resolve(mock.mockGetEvent(eventId));
  return request(`/api/events/${eventId}`);
}

export interface UpdatableEventDetails {
  weddingDate?: string | null;
  city?: string | null;
  guestCount?: number | null;
  venue?: Partial<EventVenue>;
}

export function updateEventDetails(
  eventId: string,
  patch: UpdatableEventDetails,
): Promise<{ event: WeddingEvent }> {
  if (isMockMode()) return Promise.resolve(mock.mockUpdateEventDetails(eventId, patch));
  return request(`/api/events/${eventId}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteEvent(eventId: string): Promise<void> {
  if (isMockMode()) {
    mock.mockDeleteEvent(eventId);
    return Promise.resolve();
  }
  return request(`/api/events/${eventId}`, { method: "DELETE" });
}

export interface ActivityItem extends VendorMessage {
  vendorName: string;
  vendorRole: string;
}

export function getEventActivity(eventId: string): Promise<{ activity: ActivityItem[] }> {
  if (isMockMode()) return Promise.resolve(mock.mockGetEventActivity(eventId));
  return request(`/api/events/${eventId}/activity`);
}

export function sendBulkReminder(eventId: string): Promise<{ sent: number; failed: number }> {
  if (isMockMode()) return Promise.resolve(mock.mockSendBulkReminder(eventId));
  return request("/api/vendors/bulk-reminder", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

export function addTaskToCeremony(
  eventId: string,
  ceremonyId: string,
  title: string,
): Promise<{ event: WeddingEvent }> {
  if (isMockMode()) return Promise.resolve(mock.mockAddTaskToCeremony(eventId, ceremonyId, title));
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
  if (isMockMode()) return Promise.resolve(mock.mockUpdateTaskStatus(eventId, taskId, ceremonyId, status));
  return request(`/api/events/${eventId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ ceremonyId, status }),
  });
}

export function dismissGapApi(eventId: string, gapId: string): Promise<{ event: WeddingEvent }> {
  if (isMockMode()) return Promise.resolve(mock.mockDismissGap(eventId, gapId));
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
  if (isMockMode()) return Promise.resolve(mock.mockResolveConflict(eventId, conflictId, resolvedValue));
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
  if (isMockMode()) return mock.mockMarkEventSuccessful(eventId, successful, acknowledgeIssues);

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/mark-successful`, {
    method: "POST",
    credentials: "include",
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
  if (isMockMode()) return Promise.resolve(mock.mockCheckGaps());
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
  if (isMockMode()) return Promise.resolve(mock.mockGetDashboard());
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
  if (isMockMode()) return Promise.resolve(mock.mockListVendors(eventId));
  const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
  return request(`/api/vendors${query}`);
}

export function addVendor(input: {
  eventId: string;
  name: string;
  role: string;
  phoneNumber: string;
}): Promise<{ vendor: Vendor }> {
  if (isMockMode()) return Promise.resolve(mock.mockAddVendor(input));
  return request("/api/vendors", { method: "POST", body: JSON.stringify(input) });
}

export function getVendorMessages(vendorId: string): Promise<{ messages: VendorMessage[] }> {
  if (isMockMode()) return Promise.resolve(mock.mockGetVendorMessages(vendorId));
  return request(`/api/vendors/${vendorId}/messages`);
}

export function getMessageTemplates(): Promise<{ templates: Record<string, MessageTemplateDef> }> {
  if (isMockMode()) return Promise.resolve(mock.mockGetMessageTemplates());
  return request("/api/vendors/templates");
}

export function sendVendorMessage(
  vendorId: string,
  templateName: string,
  params: string[],
): Promise<{ message: VendorMessage; status: VendorStatus }> {
  if (isMockMode()) return Promise.resolve(mock.mockSendVendorMessage(vendorId, templateName, params));
  return request(`/api/vendors/${vendorId}/send`, {
    method: "POST",
    body: JSON.stringify({ templateName, params }),
  });
}

export function trackAnalyticsEvent(name: string, properties: Record<string, unknown> = {}): void {
  if (isMockMode()) return;
  request("/api/analytics/track", {
    method: "POST",
    body: JSON.stringify({ name, properties }),
  }).catch(() => {
    // Analytics failures should never interrupt the planner's flow.
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────
// All Supabase Auth calls happen server-side; the browser only ever talks to
// these endpoints and never holds a Supabase key. Session identity is an
// httpOnly cookie set by the server, sent automatically by the browser's
// default same-origin fetch credentials mode (credentials: 'include' above).

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error?: string;
}

export function getSession(): Promise<{ user: AuthUser | null; mock: boolean }> {
  return request("/api/auth/session");
}

export function signIn(email: string, password: string): Promise<AuthResult> {
  return request("/api/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function signUp(email: string, password: string, name?: string): Promise<AuthResult> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) });
}

export function signOutRequest(): Promise<{ success: boolean }> {
  return request("/api/auth/signout", { method: "POST" });
}

/** Full-page redirect, not a JS call — the OAuth dance is entirely
 *  server-mediated (PKCE, exchanged for a session cookie on the backend's
 *  own callback route), so the browser just needs to land on this URL. */
export function googleSignInUrl(returnTo: string): string {
  return `${API_BASE_URL}/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
}

// ─── Profile ──────────────────────────────────────────────────────────

export interface PlannerProfile {
  name: string | null;
  phone: string | null;
  language: string;
  timezone: string;
  whatsappEnabled: boolean;
  vendorFollowUps: boolean;
  dailySummary: boolean;
  browserPush: boolean;
  aiInsights: boolean;
}

export function getProfile(): Promise<PlannerProfile> {
  if (isMockMode()) return Promise.resolve(mock.mockGetProfile());
  return request("/api/profile");
}

export function updateProfile(patch: Partial<Omit<PlannerProfile, "name">> & { name?: string }): Promise<PlannerProfile> {
  if (isMockMode()) return Promise.resolve(mock.mockUpdateProfile(patch));
  return request("/api/profile", { method: "PUT", body: JSON.stringify(patch) });
}
