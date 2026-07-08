import { addEvent, setLastGapCount } from "./data/eventsStore.js";
import { addVendor, addMessage } from "./data/store.js";
import type { StructuredPlan } from "./types/plan.js";

/**
 * Optional demo data, enabled by setting SEED_DEMO_DATA=true. Bypasses
 * Gemini and WhatsApp entirely so a demo looks alive even with no API
 * calls made yet. Safe to run once at boot, in-memory store resets on
 * restart anyway.
 */
export function seedDemoData(): void {
  const plan: StructuredPlan = {
    coupleNames: "Meera and Arjun",
    weddingDate: nDaysFromNow(5),
    tradition: "hindu_north_indian",
    traditionConfidence: "high",
    ceremonies: [
      {
        id: "ceremony_0_haldi",
        name: "Haldi",
        notes: "Morning ceremony, outdoor courtyard.",
        tasks: [
          { id: "t1", title: "Turmeric paste vendor confirmed", vendor: "Auntie's Kitchen", status: "confirmed" },
        ],
      },
      {
        id: "ceremony_1_mehendi",
        name: "Mehendi",
        notes: null,
        tasks: [{ id: "t2", title: "Book Mehendi artist", vendor: "Henna by Simran", status: "confirmed" }],
      },
      {
        id: "ceremony_2_wedding",
        name: "Wedding",
        notes: null,
        tasks: [
          { id: "t3", title: "Pandit or officiant booked", vendor: null, status: "pending" },
          { id: "t4", title: "Mandap and havan setup arranged", vendor: "Royal Decor Co", status: "needs_review" },
        ],
      },
      {
        id: "ceremony_3_reception",
        name: "Reception",
        notes: "250 guests expected.",
        tasks: [{ id: "t5", title: "Venue and catering headcount finalized", vendor: null, status: "pending" }],
      },
    ],
  };

  const event = addEvent(plan);
  setLastGapCount(event.id, 2);

  const caterer = addVendor({
    eventId: event.id,
    name: "Royal Decor Co",
    role: "Decor and mandap",
    phoneNumber: "919800000001",
  });
  const officiant = addVendor({
    eventId: event.id,
    name: "Pt. Suresh Sharma",
    role: "Officiant",
    phoneNumber: "919800000002",
  });

  addMessage({
    vendorId: caterer.id,
    direction: "outbound",
    body: "[vendor_confirmation_request] Confirming mandap setup for Meera and Arjun's wedding.",
    templateName: "vendor_confirmation_request",
    deliveryStatus: "delivered",
    timestamp: hoursAgo(60),
  });

  addMessage({
    vendorId: officiant.id,
    direction: "outbound",
    body: "[vendor_confirmation_request] Confirming officiant availability for Meera and Arjun's wedding.",
    templateName: "vendor_confirmation_request",
    deliveryStatus: "delivered",
    timestamp: hoursAgo(20),
  });
  addMessage({
    vendorId: officiant.id,
    direction: "inbound",
    body: "Yes, confirmed, looking forward to it.",
    timestamp: hoursAgo(19),
  });

  console.log(`Seeded demo event ${event.id} with 2 vendors and message history.`);
}

function nDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
