import { Router } from "express";
import { listEvents, planTaskProgress } from "../data/eventsStore.js";
import { getVendorStatusesForEvents } from "../data/store.js";
import { getPlannerProfile } from "../data/plannersStore.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

interface UrgentItem {
  id: string;
  eventId: string;
  coupleNames: string;
  category: string;
  label: string;
  tier: 1 | 2 | 3;
}

/**
 * Simple, explainable ranking, matches the build plan: overdue vendor
 * confirmations first, upcoming ceremony deadlines next, unresolved
 * Completeness Copilot gaps last. No learned model, just tiers.
 */
dashboardRouter.get("/", async (req, res) => {
  // Independent reads, run concurrently instead of one waiting on the other.
  const [allEvents, profile] = await Promise.all([listEvents(req.plannerId), getPlannerProfile(req.plannerId)]);
  const events = allEvents.filter((e) => e.successful === null);
  const vendorFollowUpsEnabled = profile?.vendorFollowUps ?? true;

  // Vendor statuses for every event fetched in exactly 2 queries total
  // (all vendors, then all their messages, both batched) — shared between
  // urgent items and event summaries below. This used to run 2 queries per
  // event *plus* 1 per vendor, twice over (once in a sequential loop, once
  // in a Promise.all) — O(events + vendors) round trips instead of O(1).
  const vendorStatusesByEvent = await getVendorStatusesForEvents(
    events.map((e) => e.id),
    vendorFollowUpsEnabled,
  );
  const eventsWithVendors = events.map((event) => ({
    event,
    vendorStatuses: vendorStatusesByEvent.get(event.id) ?? [],
  }));

  const urgentItems: UrgentItem[] = [];

  for (const { event, vendorStatuses } of eventsWithVendors) {
    const coupleNames = event.coupleNames ?? "Untitled wedding";

    for (const { vendor, status } of vendorStatuses) {
      if (status === "needs_attention") {
        urgentItems.push({
          id: `${event.id}_vendor_${vendor.id}`,
          eventId: event.id,
          coupleNames,
          category: "Vendor needs attention",
          label: `${vendor.name} (${vendor.role}) hasn't responded, follow up for ${coupleNames}.`,
          tier: 1,
        });
      } else if (status === "declined") {
        urgentItems.push({
          id: `${event.id}_vendor_${vendor.id}`,
          eventId: event.id,
          coupleNames,
          category: "Vendor declined",
          label: `${vendor.name} (${vendor.role}) declined, needs a replacement for ${coupleNames}.`,
          tier: 1,
        });
      }
    }

    if (event.weddingDate) {
      const daysUntil = Math.ceil((new Date(event.weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 7) {
        urgentItems.push({
          id: `${event.id}_deadline`,
          eventId: event.id,
          coupleNames,
          category: "Wedding approaching",
          label:
            daysUntil === 0
              ? `${coupleNames}'s wedding is today.`
              : `${coupleNames}'s wedding is in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`,
          tier: 2,
        });
      }
    }

    if (event.lastGapCount > 0) {
      urgentItems.push({
        id: `${event.id}_gaps`,
        eventId: event.id,
        coupleNames,
        category: "Gaps to review",
        label: `${event.lastGapCount} thing${event.lastGapCount === 1 ? "" : "s"} worth checking for ${coupleNames}.`,
        tier: 3,
      });
    }
  }

  urgentItems.sort((a, b) => a.tier - b.tier);

  const eventSummaries = eventsWithVendors.map(({ event, vendorStatuses }) => ({
    id: event.id,
    coupleNames: event.coupleNames,
    weddingDate: event.weddingDate,
    tradition: event.tradition,
    city: event.city,
    guestCount: event.guestCount,
    progress: planTaskProgress(event),
    vendorSummary: {
      total: vendorStatuses.length,
      confirmed: vendorStatuses.filter(({ status }) => status === "confirmed").length,
      needsAttention: vendorStatuses.filter(({ status }) => status === "needs_attention").length,
    },
    lastGapCount: event.lastGapCount,
  }));

  res.json({
    urgentItems: urgentItems.slice(0, 3),
    events: eventSummaries,
  });
});
