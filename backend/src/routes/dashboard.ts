import { Router } from "express";
import { listEvents, planTaskProgress } from "../data/eventsStore.js";
import { getVendorsForEvent, computeVendorStatus } from "../data/store.js";
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
  const events = (await listEvents(req.plannerId)).filter((e) => e.successful === null);
  const profile = await getPlannerProfile(req.plannerId);
  const vendorFollowUpsEnabled = profile?.vendorFollowUps ?? true;
  const urgentItems: UrgentItem[] = [];

  for (const event of events) {
    const coupleNames = event.coupleNames ?? "Untitled wedding";
    const vendors = await getVendorsForEvent(event.id);

    for (const vendor of vendors) {
      const status = await computeVendorStatus(vendor.id, { vendorFollowUpsEnabled });
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

  const eventSummaries = await Promise.all(
    events.map(async (event) => {
      const progress = planTaskProgress(event);
      const vendors = await getVendorsForEvent(event.id);
      const vendorStatuses = await Promise.all(vendors.map((v) => computeVendorStatus(v.id, { vendorFollowUpsEnabled })));
      return {
        id: event.id,
        coupleNames: event.coupleNames,
        weddingDate: event.weddingDate,
        tradition: event.tradition,
        city: event.city,
        guestCount: event.guestCount,
        progress,
        vendorSummary: {
          total: vendorStatuses.length,
          confirmed: vendorStatuses.filter((s) => s === "confirmed").length,
          needsAttention: vendorStatuses.filter((s) => s === "needs_attention").length,
        },
        lastGapCount: event.lastGapCount,
      };
    }),
  );

  res.json({
    urgentItems: urgentItems.slice(0, 3),
    events: eventSummaries,
  });
});
