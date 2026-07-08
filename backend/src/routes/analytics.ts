import { Router } from "express";
import { trackEvent, type AnalyticsEventName } from "../lib/analytics.js";

export const analyticsRouter = Router();

const VALID_EVENT_NAMES: AnalyticsEventName[] = [
  "structured_plan_generated",
  "gap_flagged",
  "gap_confirmed",
  "gap_dismissed",
  "vendor_message_sent",
  "vendor_confirmed",
  "vendor_escalated",
  "event_marked_successful",
];

analyticsRouter.post("/track", (req, res) => {
  const { name, properties } = req.body ?? {};

  if (!VALID_EVENT_NAMES.includes(name)) {
    res.status(400).json({ error: "Unknown analytics event name" });
    return;
  }

  trackEvent(name, properties ?? {});
  res.sendStatus(204);
});
