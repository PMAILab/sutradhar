import { Router } from "express";
import {
  listEvents,
  getEventById,
  updateCeremonies,
  updateEventDetails,
  setDismissedGapIds,
  markEventSuccessful,
  planTaskProgress,
  resolveConflict,
  deleteEvent,
  type UpdatableEventDetails,
} from "../data/eventsStore.js";
import {
  getVendorsForEvent,
  getVendorStatuses,
  getVendorStatusesForEvents,
  getMessagesForVendors,
  findVenueManagerVendor,
} from "../data/store.js";
import { getPlannerProfile } from "../data/plannersStore.js";
import { trackEvent } from "../lib/analytics.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

eventsRouter.get("/", async (req, res) => {
  // Independent reads, run concurrently instead of one waiting on the other.
  const [events, profile] = await Promise.all([listEvents(req.plannerId), getPlannerProfile(req.plannerId)]);
  const vendorFollowUpsEnabled = profile?.vendorFollowUps ?? true;

  // 2 queries total for every event's vendor statuses (all vendors, then
  // all their messages, both batched) instead of 1 vendors query per event
  // plus 1 messages query per vendor.
  const vendorStatusesByEvent = await getVendorStatusesForEvents(
    events.map((e) => e.id),
    vendorFollowUpsEnabled,
  );

  const withSummary = events.map((event) => {
    const vendorStatuses = vendorStatusesByEvent.get(event.id) ?? [];
    return {
      id: event.id,
      coupleNames: event.coupleNames,
      weddingDate: event.weddingDate,
      tradition: event.tradition,
      city: event.city,
      guestCount: event.guestCount,
      ceremonyCount: event.ceremonies.length,
      progress: planTaskProgress(event),
      vendorSummary: {
        total: vendorStatuses.length,
        confirmed: vendorStatuses.filter(({ status }) => status === "confirmed").length,
        needsAttention: vendorStatuses.filter(({ status }) => status === "needs_attention").length,
      },
      lastGapCount: event.lastGapCount,
      successful: event.successful,
    };
  });
  res.json({ events: withSummary });
});

eventsRouter.get("/:id", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const venueManager = await findVenueManagerVendor(event.id);
  res.json({ event, venueManagerPhone: venueManager?.phoneNumber ?? null });
});

// Manual correction for whatever the intake AI didn't catch (city, guest
// count, single-venue weddings) — the only write path for those fields
// besides the initial Gemini parse, since there's no re-run-intake option.
eventsRouter.patch("/:id", async (req, res) => {
  const { weddingDate, city, guestCount, venue } = req.body ?? {};
  const patch: UpdatableEventDetails = {};

  if (weddingDate !== undefined) {
    if (weddingDate !== null && typeof weddingDate !== "string") {
      res.status(400).json({ error: "weddingDate must be a string or null" });
      return;
    }
    patch.weddingDate = weddingDate;
  }
  if (city !== undefined) {
    if (city !== null && typeof city !== "string") {
      res.status(400).json({ error: "city must be a string or null" });
      return;
    }
    patch.city = city;
  }
  if (guestCount !== undefined) {
    if (guestCount !== null && typeof guestCount !== "number") {
      res.status(400).json({ error: "guestCount must be a number or null" });
      return;
    }
    patch.guestCount = guestCount;
  }
  if (venue !== undefined) {
    if (typeof venue !== "object" || venue === null) {
      res.status(400).json({ error: "venue must be an object" });
      return;
    }
    patch.venue = venue;
  }

  const updated = await updateEventDetails(req.params.id, req.plannerId, patch);
  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json({ event: updated });
});

eventsRouter.delete("/:id", async (req, res) => {
  const deleted = await deleteEvent(req.params.id, req.plannerId);
  if (!deleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  trackEvent("event_deleted", { eventId: req.params.id });
  res.status(204).end();
});

// Activity tab feed: every WhatsApp message across every vendor on this
// event, merged and sorted newest first. No separate activity log table,
// this is the real send/receive history already captured per vendor.
eventsRouter.get("/:id/activity", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const vendors = await getVendorsForEvent(event.id);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const messagesByVendor = await getMessagesForVendors(vendors.map((v) => v.id));
  const activity = [...messagesByVendor.values()]
    .flat()
    .map((message) => ({
      ...message,
      vendorName: vendorById.get(message.vendorId)?.name ?? "Unknown vendor",
      vendorRole: vendorById.get(message.vendorId)?.role ?? "",
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({ activity });
});

eventsRouter.post("/:id/ceremonies", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const ceremony = {
    id: `ceremony_${event.ceremonies.length}_${Date.now()}`,
    name: name.trim(),
    notes: null,
    tasks: [],
  };
  event.ceremonies.push(ceremony);

  await updateCeremonies(event.id, event.ceremonies);
  res.status(201).json({ event });
});

eventsRouter.delete("/:id/ceremonies/:ceremonyId", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const ceremony = event.ceremonies.find((c) => c.id === req.params.ceremonyId);
  if (!ceremony) {
    res.status(404).json({ error: "Ceremony not found" });
    return;
  }

  event.ceremonies = event.ceremonies.filter((c) => c.id !== req.params.ceremonyId);
  await updateCeremonies(event.id, event.ceremonies);
  res.json({ event });
});

eventsRouter.post("/:id/tasks", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const { ceremonyId, title } = req.body ?? {};
  const ceremony = event.ceremonies.find((c) => c.id === ceremonyId);
  if (!ceremony || !title) {
    res.status(400).json({ error: "ceremonyId and title are required, and the ceremony must exist" });
    return;
  }

  ceremony.tasks.push({
    id: `${ceremonyId}_task_${ceremony.tasks.length}_${Date.now()}`,
    title,
    vendor: null,
    status: "pending",
  });

  await updateCeremonies(event.id, event.ceremonies);
  res.status(201).json({ event });
});

eventsRouter.patch("/:id/tasks/:taskId", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const { ceremonyId, status } = req.body ?? {};
  const ceremony = event.ceremonies.find((c) => c.id === ceremonyId);
  const task = ceremony?.tasks.find((t) => t.id === req.params.taskId);
  if (!ceremony || !task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  task.status = status;
  await updateCeremonies(event.id, event.ceremonies);
  res.json({ event });
});

eventsRouter.post("/:id/dismiss-gap", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const { gapId } = req.body ?? {};
  if (!gapId) {
    res.status(400).json({ error: "gapId is required" });
    return;
  }
  const nextIds = event.dismissedGapIds.includes(gapId) ? event.dismissedGapIds : [...event.dismissedGapIds, gapId];
  await setDismissedGapIds(event.id, nextIds);
  res.json({ event: { ...event, dismissedGapIds: nextIds } });
});

eventsRouter.post("/:id/resolve-conflict", async (req, res) => {
  const { conflictId, resolvedValue } = req.body ?? {};
  if (!conflictId || typeof resolvedValue !== "string") {
    res.status(400).json({ error: "conflictId and resolvedValue are required" });
    return;
  }
  const owned = await getEventById(req.params.id, req.plannerId);
  if (!owned) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const event = await resolveConflict(req.params.id, conflictId, resolvedValue);
  res.json({ event });
});

eventsRouter.post("/:id/mark-successful", async (req, res) => {
  const event = await getEventById(req.params.id, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const { successful, acknowledgeIssues } = req.body ?? {};

  if (successful) {
    const vendors = await getVendorsForEvent(event.id);
    const vendorStatuses = (await getVendorStatuses(vendors, true)).map(({ vendor, status }) => ({
      ...vendor,
      status,
    }));
    const problemVendors = vendorStatuses.filter((v) => v.status === "needs_attention" || v.status === "declined");
    const unresolvedConflicts = event.conflicts.filter((c) => !c.resolved);

    if ((problemVendors.length > 0 || unresolvedConflicts.length > 0) && !acknowledgeIssues) {
      res.status(409).json({
        warning: true,
        message:
          "This wedding has open issues, the North Star definition needs no missed vendor deadline. Confirm you want to mark it successful anyway.",
        problemVendors: problemVendors.map((v) => ({ id: v.id, name: v.name, role: v.role, status: v.status })),
        unresolvedConflicts: unresolvedConflicts.map((c) => ({ id: c.id, description: c.description })),
      });
      return;
    }
  }

  const updated = await markEventSuccessful(req.params.id, Boolean(successful));
  if (updated?.successful) {
    trackEvent("event_marked_successful", { eventId: updated.id, acknowledgedIssues: Boolean(acknowledgeIssues) });
  }
  res.json({ event: updated });
});
