import { Router } from "express";
import {
  listEvents,
  getEventById,
  updateCeremonies,
  setDismissedGapIds,
  markEventSuccessful,
  planTaskProgress,
} from "../data/eventsStore.js";
import { getVendorsForEvent, computeVendorStatus } from "../data/store.js";
import { trackEvent } from "../lib/analytics.js";

export const eventsRouter = Router();

eventsRouter.get("/", (_req, res) => {
  const withSummary = listEvents().map((event) => {
    const progress = planTaskProgress(event);
    const vendorStatuses = getVendorsForEvent(event.id).map((v) => computeVendorStatus(v.id));
    return {
      id: event.id,
      coupleNames: event.coupleNames,
      weddingDate: event.weddingDate,
      tradition: event.tradition,
      ceremonyCount: event.ceremonies.length,
      progress,
      vendorSummary: {
        total: vendorStatuses.length,
        confirmed: vendorStatuses.filter((s) => s === "confirmed").length,
        needsAttention: vendorStatuses.filter((s) => s === "needs_attention").length,
      },
      lastGapCount: event.lastGapCount,
      successful: event.successful,
    };
  });
  res.json({ events: withSummary });
});

eventsRouter.get("/:id", (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json({ event });
});

eventsRouter.post("/:id/tasks", (req, res) => {
  const event = getEventById(req.params.id);
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

  updateCeremonies(event.id, event.ceremonies);
  res.status(201).json({ event });
});

eventsRouter.patch("/:id/tasks/:taskId", (req, res) => {
  const event = getEventById(req.params.id);
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
  updateCeremonies(event.id, event.ceremonies);
  res.json({ event });
});

eventsRouter.post("/:id/dismiss-gap", (req, res) => {
  const event = getEventById(req.params.id);
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
  setDismissedGapIds(event.id, nextIds);
  res.json({ event });
});

eventsRouter.post("/:id/mark-successful", (req, res) => {
  const { successful } = req.body ?? {};
  const event = markEventSuccessful(req.params.id, Boolean(successful));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (event.successful) {
    trackEvent("event_marked_successful", { eventId: event.id });
  }
  res.json({ event });
});
