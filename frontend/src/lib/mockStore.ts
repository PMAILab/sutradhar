// Client-side mock data, mirroring backend/src/seed.ts's old three demo
// weddings — but here instead of being written into a real Supabase
// project at boot, it lives entirely in the browser (localStorage),
// active only when AuthContext learns the session is mock (no Supabase
// configured, see backend/src/routes/auth.ts). This is what lets the app
// be fully explorable — read AND write, not just a read-only preview —
// with zero backend configuration, same as TailorTrip's own mock mode.
import type {
  WeddingEvent,
  EventSummary,
  PlanCeremony,
  Gap,
  DashboardUrgentItem,
  Vendor,
  VendorMessage,
  VendorStatus,
  MessageTemplateDef,
  ActivityItem,
  PlannerProfile,
  MarkSuccessfulResult,
  StructuredPlan,
} from "./api";

let mockModeEnabled = false;
export function setMockMode(enabled: boolean): void {
  mockModeEnabled = enabled;
}
export function isMockMode(): boolean {
  return mockModeEnabled;
}

const STORAGE_KEY = "sutradhar_mock_db";
const MESSAGE_TEMPLATES: Record<string, MessageTemplateDef> = {
  vendor_confirmation_request: {
    name: "vendor_confirmation_request",
    languageCode: "en_US",
    paramLabels: ["Vendor name", "Planner or business name", "Couple names", "Wedding date", "Deliverable"],
  },
  payment_reminder: {
    name: "payment_reminder",
    languageCode: "en_US",
    paramLabels: ["Vendor name", "Amount", "Couple names", "Due date"],
  },
  plan_update: {
    name: "plan_update",
    languageCode: "en_US",
    paramLabels: ["Vendor name", "Couple names", "Update details"],
  },
};

interface MockVendor {
  id: string;
  eventId: string;
  name: string;
  role: string;
  phoneNumber: string;
  createdAt: string;
}

interface MockDb {
  events: WeddingEvent[];
  vendors: MockVendor[];
  messages: VendorMessage[];
  profile: PlannerProfile;
}

function nDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function seedDb(): MockDb {
  const events: WeddingEvent[] = [
    {
      id: "mock_meera_arjun",
      createdAt: hoursAgo(72),
      dismissedGapIds: [],
      lastGapCount: 0,
      completedAt: null,
      successful: null,
      coupleNames: "Meera & Arjun",
      weddingDate: nDaysFromNow(5),
      tradition: "hindu_north_indian",
      traditionConfidence: "high",
      city: "Udaipur",
      guestCount: 250,
      venue: { name: "The Leela Palace", address: "Lake Pichola, Udaipur, Rajasthan", capacity: 300 },
      conflicts: [
        {
          id: "conf_meera_1",
          description: "Two different Sangeet dates were mentioned in the brief. Which one holds?",
          options: ["Fri, evening before", "Thu, two nights before"],
          resolved: false,
          resolvedValue: null,
        },
      ],
      ceremonies: [
        {
          id: "cer_meera_haldi",
          name: "Haldi",
          notes: "Morning ceremony, outdoor courtyard.",
          tasks: [
            { id: "tk_meera_1", title: "Turmeric paste vendor confirmed", vendor: "Auntie's Kitchen", status: "confirmed" },
            { id: "tk_meera_2", title: "Marigold decor for courtyard", vendor: "Royal Decor Co", status: "needs_review" },
          ],
        },
        {
          id: "cer_meera_mehendi",
          name: "Mehendi",
          notes: null,
          tasks: [{ id: "tk_meera_3", title: "Book Mehendi artist", vendor: "Henna by Simran", status: "confirmed" }],
        },
        {
          id: "cer_meera_sangeet",
          name: "Sangeet",
          notes: "Choreographer needed for family performances.",
          tasks: [{ id: "tk_meera_4", title: "Confirm sound and stage", vendor: null, status: "pending" }],
        },
        {
          id: "cer_meera_wedding",
          name: "Wedding",
          notes: null,
          tasks: [
            { id: "tk_meera_5", title: "Pandit or officiant booked", vendor: "Pt. Suresh Sharma", status: "confirmed" },
            { id: "tk_meera_6", title: "Mandap and havan setup arranged", vendor: "Royal Decor Co", status: "needs_review" },
          ],
        },
        {
          id: "cer_meera_reception",
          name: "Reception",
          notes: "250 guests expected.",
          tasks: [{ id: "tk_meera_7", title: "Venue and catering headcount finalized", vendor: null, status: "pending" }],
        },
      ],
    },
    {
      id: "mock_isha_rohan",
      createdAt: hoursAgo(96),
      dismissedGapIds: [],
      lastGapCount: 0,
      completedAt: null,
      successful: null,
      coupleNames: "Isha & Rohan",
      weddingDate: nDaysFromNow(34),
      tradition: "hindu_north_indian",
      traditionConfidence: "high",
      city: "Jaipur",
      guestCount: 450,
      venue: { name: "Rambagh Palace", address: "Bhawani Singh Rd, Jaipur, Rajasthan", capacity: 500 },
      conflicts: [],
      ceremonies: [
        {
          id: "cer_isha_haldi",
          name: "Haldi",
          notes: null,
          tasks: [{ id: "tk_isha_1", title: "Haldi decor and seating", vendor: "Jaipur Event Co", status: "confirmed" }],
        },
        {
          id: "cer_isha_sangeet",
          name: "Sangeet",
          notes: "Live band booked.",
          tasks: [
            { id: "tk_isha_2", title: "Confirm live band", vendor: "The Baraat Beats", status: "confirmed" },
            { id: "tk_isha_3", title: "Lighting and stage", vendor: "Jaipur Event Co", status: "pending" },
          ],
        },
        {
          id: "cer_isha_wedding",
          name: "Wedding",
          notes: null,
          tasks: [
            { id: "tk_isha_4", title: "Baraat procession arrangement", vendor: "The Baraat Beats", status: "confirmed" },
            { id: "tk_isha_5", title: "Photographer for pheras", vendor: "Vikas Soni Studio", status: "needs_review" },
          ],
        },
        {
          id: "cer_isha_reception",
          name: "Reception",
          notes: "450 guests, plated dinner.",
          tasks: [{ id: "tk_isha_6", title: "Finalize plated menu tasting", vendor: "Kitchen Crafts", status: "pending" }],
        },
      ],
    },
    {
      id: "mock_sara_bilal",
      createdAt: hoursAgo(48),
      dismissedGapIds: [],
      lastGapCount: 0,
      completedAt: null,
      successful: null,
      coupleNames: "Sara & Bilal",
      weddingDate: nDaysFromNow(72),
      tradition: "muslim_nikah",
      traditionConfidence: "high",
      city: "Hyderabad",
      guestCount: 120,
      venue: { name: "Taj Falaknuma Palace", address: "Engine Bowli, Hyderabad, Telangana", capacity: 200 },
      conflicts: [],
      ceremonies: [
        {
          id: "cer_sara_mehendi",
          name: "Mehendi",
          notes: null,
          tasks: [{ id: "tk_sara_1", title: "Mehendi artist for the bride", vendor: "Henna Tales", status: "confirmed" }],
        },
        {
          id: "cer_sara_nikah",
          name: "Nikah",
          notes: "Qazi confirmed; Mehr terms pending.",
          tasks: [
            { id: "tk_sara_2", title: "Qazi booked for the ceremony", vendor: "Maulana Yusuf", status: "confirmed" },
            { id: "tk_sara_3", title: "Nikah seating and stage", vendor: "Deccan Decor", status: "pending" },
          ],
        },
        {
          id: "cer_sara_walima",
          name: "Walima",
          notes: "Reception hosted by groom's family.",
          tasks: [{ id: "tk_sara_4", title: "Walima catering headcount", vendor: "Paradise Caterers", status: "needs_review" }],
        },
      ],
    },
  ];

  const vendors: MockVendor[] = [
    { id: "v_royal_decor", eventId: "mock_meera_arjun", name: "Royal Decor Co", role: "Decor and mandap", phoneNumber: "919800000001", createdAt: hoursAgo(70) },
    { id: "v_suresh_sharma", eventId: "mock_meera_arjun", name: "Pt. Suresh Sharma", role: "Officiant", phoneNumber: "919800000002", createdAt: hoursAgo(70) },
    { id: "v_henna_simran", eventId: "mock_meera_arjun", name: "Henna by Simran", role: "Mehendi artist", phoneNumber: "919800000003", createdAt: hoursAgo(70) },
    { id: "v_spice_route", eventId: "mock_meera_arjun", name: "Spice Route Catering", role: "Caterer", phoneNumber: "919800000004", createdAt: hoursAgo(70) },
    { id: "v_vikas_soni", eventId: "mock_isha_rohan", name: "Vikas Soni Studio", role: "Photographer", phoneNumber: "919800000010", createdAt: hoursAgo(90) },
    { id: "v_kitchen_crafts", eventId: "mock_isha_rohan", name: "Kitchen Crafts", role: "Caterer", phoneNumber: "919800000011", createdAt: hoursAgo(90) },
    { id: "v_baraat_beats", eventId: "mock_isha_rohan", name: "The Baraat Beats", role: "Band and baraat", phoneNumber: "919800000012", createdAt: hoursAgo(90) },
    { id: "v_jaipur_event", eventId: "mock_isha_rohan", name: "Jaipur Event Co", role: "Decor", phoneNumber: "919800000013", createdAt: hoursAgo(90) },
    { id: "v_paradise_caterers", eventId: "mock_sara_bilal", name: "Paradise Caterers", role: "Caterer", phoneNumber: "919800000020", createdAt: hoursAgo(45) },
    { id: "v_maulana_yusuf", eventId: "mock_sara_bilal", name: "Maulana Yusuf", role: "Qazi", phoneNumber: "919800000021", createdAt: hoursAgo(45) },
    { id: "v_deccan_decor", eventId: "mock_sara_bilal", name: "Deccan Decor", role: "Decor", phoneNumber: "919800000022", createdAt: hoursAgo(45) },
  ];

  function outcomeMessages(vendorId: string, role: string, coupleNames: string, outcome: "confirmed" | "declined" | "needs_attention" | "sent"): VendorMessage[] {
    const base: VendorMessage = {
      id: `${vendorId}_out`,
      vendorId,
      direction: "outbound",
      body: `[vendor_confirmation_request] Confirming ${role} for ${coupleNames}.`,
      templateName: "vendor_confirmation_request",
      deliveryStatus: "delivered",
      timestamp: hoursAgo(outcome === "needs_attention" ? 60 : outcome === "sent" ? 5 : outcome === "declined" ? 30 : 20),
    };
    if (outcome === "confirmed") {
      return [base, { id: `${vendorId}_in`, vendorId, direction: "inbound", body: "Yes, confirmed, looking forward to it.", timestamp: hoursAgo(19) }];
    }
    if (outcome === "declined") {
      return [base, { id: `${vendorId}_in`, vendorId, direction: "inbound", body: "Sorry, we are unable to take this date.", timestamp: hoursAgo(28) }];
    }
    return [base];
  }

  const outcomes: Record<string, "confirmed" | "declined" | "needs_attention" | "sent"> = {
    v_royal_decor: "needs_attention",
    v_suresh_sharma: "confirmed",
    v_henna_simran: "confirmed",
    v_spice_route: "sent",
    v_vikas_soni: "confirmed",
    v_kitchen_crafts: "sent",
    v_baraat_beats: "confirmed",
    v_jaipur_event: "declined",
    v_paradise_caterers: "sent",
    v_maulana_yusuf: "confirmed",
    v_deccan_decor: "needs_attention",
  };

  const eventNameById = new Map(events.map((e) => [e.id, e.coupleNames ?? "the couple"]));
  const messages: VendorMessage[] = vendors.flatMap((v) =>
    outcomeMessages(v.id, v.role, eventNameById.get(v.eventId) ?? "the couple", outcomes[v.id] ?? "sent"),
  );

  return {
    events,
    vendors,
    messages,
    profile: {
      name: "Guest Planner",
      phone: null,
      language: "English (UK)",
      timezone: "IST (UTC+5:30)",
      whatsappEnabled: true,
      vendorFollowUps: true,
      dailySummary: true,
      browserPush: true,
      aiInsights: false,
    },
  };
}

function loadDb(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh = seedDb();
    saveDb(fresh);
    return fresh;
  }
  try {
    return JSON.parse(raw) as MockDb;
  } catch {
    const fresh = seedDb();
    saveDb(fresh);
    return fresh;
  }
}

function saveDb(db: MockDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

const ESCALATION_HOURS = 48;
const CONFIRM_WORDS = ["yes", "confirmed", "confirm", "done", "sure", "haan", "ok", "okay", "sorted"];
const DECLINE_WORDS = ["no", "cannot", "can't", "cant", "unable", "sorry", "not possible", "won't"];

function classifyReply(body: string): "confirmed" | "declined" | "needs_review" {
  const normalized = body.trim().toLowerCase();
  if (CONFIRM_WORDS.some((w) => normalized.includes(w))) return "confirmed";
  if (DECLINE_WORDS.some((w) => normalized.includes(w))) return "declined";
  return "needs_review";
}

function computeVendorStatus(messages: VendorMessage[]): VendorStatus {
  if (messages.length === 0) return "not_contacted";
  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const lastOutbound = [...messages].reverse().find((m) => m.direction === "outbound");
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

function toVendor(db: MockDb, v: MockVendor): Vendor {
  const vendorMessages = db.messages.filter((m) => m.vendorId === v.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return {
    ...v,
    status: computeVendorStatus(vendorMessages),
    lastMessage: vendorMessages.at(-1) ?? null,
  };
}

function planTaskProgress(event: WeddingEvent): { confirmed: number; total: number } {
  let confirmed = 0;
  let total = 0;
  for (const c of event.ceremonies) {
    for (const t of c.tasks) {
      total += 1;
      if (t.status === "confirmed") confirmed += 1;
    }
  }
  return { confirmed, total };
}

function vendorSummary(db: MockDb, eventId: string) {
  const statuses = db.vendors.filter((v) => v.eventId === eventId).map((v) => toVendor(db, v).status);
  return {
    total: statuses.length,
    confirmed: statuses.filter((s) => s === "confirmed").length,
    needsAttention: statuses.filter((s) => s === "needs_attention").length,
  };
}

function toSummary(db: MockDb, event: WeddingEvent): EventSummary {
  return {
    id: event.id,
    coupleNames: event.coupleNames,
    weddingDate: event.weddingDate,
    tradition: event.tradition,
    city: event.city,
    guestCount: event.guestCount,
    progress: planTaskProgress(event),
    vendorSummary: vendorSummary(db, event.id),
    lastGapCount: event.lastGapCount,
    successful: event.successful,
  };
}

function findEvent(db: MockDb, eventId: string): WeddingEvent {
  const event = db.events.find((e) => e.id === eventId);
  if (!event) throw new Error("This wedding could not be found.");
  return event;
}

function findVenueManagerPhone(db: MockDb, eventId: string): string | null {
  const manager = db.vendors.find((v) => v.eventId === eventId && (/venue/i.test(v.role) || /venue/i.test(v.name)));
  return manager?.phoneNumber ?? null;
}

// ─── Public mock API, one function per real api.ts export it stands in for ───

export function mockGetDashboard(): { urgentItems: DashboardUrgentItem[]; events: EventSummary[] } {
  const db = loadDb();
  const active = db.events.filter((e) => e.successful === null);
  const urgentItems: DashboardUrgentItem[] = [];

  for (const event of active) {
    const coupleNames = event.coupleNames ?? "Untitled wedding";
    for (const v of db.vendors.filter((v) => v.eventId === event.id)) {
      const status = toVendor(db, v).status;
      if (status === "needs_attention") {
        urgentItems.push({ id: `${event.id}_vendor_${v.id}`, eventId: event.id, coupleNames, category: "Vendor needs attention", label: `${v.name} (${v.role}) hasn't responded, follow up for ${coupleNames}.`, tier: 1 });
      } else if (status === "declined") {
        urgentItems.push({ id: `${event.id}_vendor_${v.id}`, eventId: event.id, coupleNames, category: "Vendor declined", label: `${v.name} (${v.role}) declined, needs a replacement for ${coupleNames}.`, tier: 1 });
      }
    }
    if (event.weddingDate) {
      const daysUntil = Math.ceil((new Date(event.weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 7) {
        urgentItems.push({ id: `${event.id}_deadline`, eventId: event.id, coupleNames, category: "Wedding approaching", label: daysUntil === 0 ? `${coupleNames}'s wedding is today.` : `${coupleNames}'s wedding is in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`, tier: 2 });
      }
    }
  }
  urgentItems.sort((a, b) => a.tier - b.tier);
  return { urgentItems: urgentItems.slice(0, 3), events: active.map((e) => toSummary(db, e)) };
}

export function mockListEvents(): { events: EventSummary[] } {
  const db = loadDb();
  return { events: db.events.map((e) => toSummary(db, e)) };
}

export function mockGetEvent(eventId: string): { event: WeddingEvent; venueManagerPhone: string | null } {
  const db = loadDb();
  return { event: findEvent(db, eventId), venueManagerPhone: findVenueManagerPhone(db, eventId) };
}

export function mockGetEventActivity(eventId: string): { activity: ActivityItem[] } {
  const db = loadDb();
  const vendorIds = new Set(db.vendors.filter((v) => v.eventId === eventId).map((v) => v.id));
  const vendorById = new Map(db.vendors.map((v) => [v.id, v]));
  const activity = db.messages
    .filter((m) => vendorIds.has(m.vendorId))
    .map((m) => ({ ...m, vendorName: vendorById.get(m.vendorId)?.name ?? "Unknown vendor", vendorRole: vendorById.get(m.vendorId)?.role ?? "" }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { activity };
}

export function mockSendBulkReminder(eventId: string): { sent: number; failed: number } {
  const db = loadDb();
  let sent = 0;
  const event = findEvent(db, eventId);
  for (const v of db.vendors.filter((v) => v.eventId === eventId)) {
    if (toVendor(db, v).status === "confirmed") continue;
    db.messages.push({
      id: `${v.id}_bulk_${Date.now()}`,
      vendorId: v.id,
      direction: "outbound",
      body: `[plan_update] ${v.name} / ${event.coupleNames ?? "the couple"} / Checking in on where things stand, please confirm at your earliest convenience.`,
      templateName: "plan_update",
      deliveryStatus: "sent",
      timestamp: new Date().toISOString(),
    });
    sent += 1;
  }
  saveDb(db);
  return { sent, failed: 0 };
}

export function mockAddCeremony(eventId: string, name: string): { event: WeddingEvent } {
  const db = loadDb();
  const event = findEvent(db, eventId);
  event.ceremonies.push({ id: `ceremony_${Date.now()}`, name, notes: null, tasks: [] });
  saveDb(db);
  return { event };
}

export function mockDeleteCeremony(eventId: string, ceremonyId: string): { event: WeddingEvent } {
  const db = loadDb();
  const event = findEvent(db, eventId);
  event.ceremonies = event.ceremonies.filter((c) => c.id !== ceremonyId);
  saveDb(db);
  return { event };
}

export function mockAddTaskToCeremony(eventId: string, ceremonyId: string, title: string): { event: WeddingEvent } {
  const db = loadDb();
  const event = findEvent(db, eventId);
  const ceremony = event.ceremonies.find((c) => c.id === ceremonyId);
  if (!ceremony) throw new Error("That ceremony could not be found.");
  ceremony.tasks.push({ id: `${ceremonyId}_task_${Date.now()}`, title, vendor: null, status: "pending" });
  saveDb(db);
  return { event };
}

export function mockUpdateTaskStatus(eventId: string, taskId: string, ceremonyId: string, status: "pending" | "confirmed" | "needs_review"): { event: WeddingEvent } {
  const db = loadDb();
  const event = findEvent(db, eventId);
  const ceremony = event.ceremonies.find((c) => c.id === ceremonyId);
  const task = ceremony?.tasks.find((t) => t.id === taskId);
  if (!ceremony || !task) throw new Error("That task could not be found.");
  task.status = status;
  saveDb(db);
  return { event };
}

export function mockUpdateEventDetails(
  eventId: string,
  patch: { weddingDate?: string | null; city?: string | null; guestCount?: number | null; venue?: Partial<WeddingEvent["venue"]> },
): { event: WeddingEvent } {
  const db = loadDb();
  const event = findEvent(db, eventId);
  if ("weddingDate" in patch) event.weddingDate = patch.weddingDate ?? null;
  if ("city" in patch) event.city = patch.city ?? null;
  if ("guestCount" in patch) event.guestCount = patch.guestCount ?? null;
  if (patch.venue) event.venue = { ...event.venue, ...patch.venue };
  saveDb(db);
  return { event };
}

export function mockDismissGap(eventId: string, gapId: string): { event: WeddingEvent } {
  const db = loadDb();
  const event = findEvent(db, eventId);
  if (!event.dismissedGapIds.includes(gapId)) event.dismissedGapIds.push(gapId);
  saveDb(db);
  return { event };
}

export function mockResolveConflict(eventId: string, conflictId: string, resolvedValue: string): { event: WeddingEvent } {
  const db = loadDb();
  const event = findEvent(db, eventId);
  const conflict = event.conflicts.find((c) => c.id === conflictId);
  if (conflict) {
    conflict.resolved = true;
    conflict.resolvedValue = resolvedValue;
  }
  saveDb(db);
  return { event };
}

export function mockDeleteEvent(eventId: string): void {
  const db = loadDb();
  db.events = db.events.filter((e) => e.id !== eventId);
  const remainingVendorIds = new Set(db.vendors.filter((v) => v.eventId !== eventId).map((v) => v.id));
  db.vendors = db.vendors.filter((v) => v.eventId !== eventId);
  db.messages = db.messages.filter((m) => remainingVendorIds.has(m.vendorId));
  saveDb(db);
}

export function mockMarkEventSuccessful(eventId: string, successful: boolean, acknowledgeIssues = false): MarkSuccessfulResult {
  const db = loadDb();
  const event = findEvent(db, eventId);

  if (successful) {
    const problemVendors = db.vendors
      .filter((v) => v.eventId === eventId)
      .map((v) => ({ ...v, status: toVendor(db, v).status }))
      .filter((v) => v.status === "needs_attention" || v.status === "declined");
    const unresolvedConflicts = event.conflicts.filter((c) => !c.resolved);

    if ((problemVendors.length > 0 || unresolvedConflicts.length > 0) && !acknowledgeIssues) {
      return {
        warning: true,
        message: "This wedding has open issues, the North Star definition needs no missed vendor deadline. Confirm you want to mark it successful anyway.",
        problemVendors: problemVendors.map((v) => ({ id: v.id, name: v.name, role: v.role, status: v.status })),
        unresolvedConflicts: unresolvedConflicts.map((c) => ({ id: c.id, description: c.description })),
      };
    }
  }

  event.successful = successful;
  event.completedAt = new Date().toISOString();
  saveDb(db);
  return { event };
}

/** No Completeness Copilot in mock mode — no AI knowledge base to check
 *  against client-side, and fabricating gap suggestions would be dishonest
 *  demo data. Same "never fail closed" philosophy as the real backend's
 *  Gemini fallback, just with an explicit note instead of guessed content. */
export function mockCheckGaps(): { gaps: Gap[]; note?: string } {
  return { gaps: [], note: "Completeness Copilot needs a configured backend, this demo runs without one." };
}

export function mockListVendors(eventId?: string): { vendors: Vendor[] } {
  const db = loadDb();
  const scoped = eventId ? db.vendors.filter((v) => v.eventId === eventId) : db.vendors;
  return { vendors: scoped.map((v) => toVendor(db, v)) };
}

export function mockAddVendor(input: { eventId: string; name: string; role: string; phoneNumber: string }): { vendor: Vendor } {
  const db = loadDb();
  const vendor: MockVendor = { id: `v_${Date.now()}`, eventId: input.eventId, name: input.name, role: input.role, phoneNumber: input.phoneNumber.replace(/[^0-9]/g, ""), createdAt: new Date().toISOString() };
  db.vendors.push(vendor);
  saveDb(db);
  return { vendor: toVendor(db, vendor) };
}

export function mockGetVendorMessages(vendorId: string): { messages: VendorMessage[] } {
  const db = loadDb();
  return { messages: db.messages.filter((m) => m.vendorId === vendorId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) };
}

export function mockGetMessageTemplates(): { templates: Record<string, MessageTemplateDef> } {
  return { templates: MESSAGE_TEMPLATES };
}

export function mockSendVendorMessage(vendorId: string, templateName: string, params: string[]): { message: VendorMessage; status: VendorStatus } {
  const db = loadDb();
  const vendor = db.vendors.find((v) => v.id === vendorId);
  if (!vendor) throw new Error("That vendor could not be found.");
  const message: VendorMessage = {
    id: `${vendorId}_${Date.now()}`,
    vendorId,
    direction: "outbound",
    body: `[${templateName}] ${params.join(" / ")}`,
    templateName,
    deliveryStatus: "sent",
    timestamp: new Date().toISOString(),
  };
  db.messages.push(message);
  saveDb(db);
  return { message, status: toVendor(db, vendor).status };
}

/** Same zero-AI fallback shape as the real backend's intake.ts uses when
 *  Gemini isn't configured — a single "Review this brief" ceremony holding
 *  the raw paste, rather than fabricating a structured plan client-side. */
export function mockParseIntake(rawText: string): { event: WeddingEvent; fallback: true } {
  const db = loadDb();
  const id = `mock_event_${Date.now()}`;
  const ceremonies: PlanCeremony[] = [
    {
      id: `${id}_ceremony_0`,
      name: "Review this brief",
      notes: "Structuring isn't available in this demo, add ceremonies and tasks manually below.",
      tasks: [{ id: `${id}_task_0`, title: rawText.length > 500 ? `${rawText.slice(0, 500)}…` : rawText, vendor: null, status: "needs_review" }],
    },
  ];
  const plan: StructuredPlan = { coupleNames: null, weddingDate: null, tradition: "unspecified", traditionConfidence: "low", ceremonies, conflicts: [] };
  const event: WeddingEvent = {
    ...plan,
    id,
    createdAt: new Date().toISOString(),
    dismissedGapIds: [],
    lastGapCount: 0,
    completedAt: null,
    successful: null,
    city: null,
    guestCount: null,
    venue: { name: null, address: null, capacity: null },
  };
  db.events.push(event);
  saveDb(db);
  return { event, fallback: true };
}

export function mockGetProfile(): PlannerProfile {
  return loadDb().profile;
}

export function mockUpdateProfile(patch: Partial<PlannerProfile>): PlannerProfile {
  const db = loadDb();
  db.profile = { ...db.profile, ...patch };
  saveDb(db);
  return db.profile;
}
