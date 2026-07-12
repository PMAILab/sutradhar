import { Router } from "express";
import {
  addVendor,
  getVendorById,
  addMessage,
  getMessagesForVendor,
  computeVendorStatus,
  getVendorStatusesForPlanner,
  markEscalatedIfNew,
} from "../data/store.js";
import { getEventById } from "../data/eventsStore.js";
import { MESSAGE_TEMPLATES } from "../data/messageTemplates.js";
import { sendTemplateMessage, WhatsAppSendError } from "../lib/whatsapp.js";
import { trackEvent } from "../lib/analytics.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPlannerProfile } from "../data/plannersStore.js";

export const vendorsRouter = Router();
vendorsRouter.use(requireAuth);

vendorsRouter.get("/", async (req, res) => {
  const eventId = typeof req.query.eventId === "string" ? req.query.eventId : undefined;
  const profile = await getPlannerProfile(req.plannerId);
  const vendorFollowUpsEnabled = profile?.vendorFollowUps ?? true;

  // Vendors and their messages in one nested query instead of one query
  // per vendor inside computeVendorStatus *plus* a second one here for
  // lastMessage.
  const withStatus = (await getVendorStatusesForPlanner(req.plannerId, vendorFollowUpsEnabled, eventId)).map(
    ({ vendor, status, history }) => {
      if (status === "needs_attention" && markEscalatedIfNew(vendor.id)) {
        trackEvent("vendor_escalated", { vendorId: vendor.id });
      }
      return {
        ...vendor,
        status,
        lastMessage: history.at(-1) ?? null,
      };
    },
  );
  res.json({ vendors: withStatus });
});

vendorsRouter.post("/", async (req, res) => {
  const { eventId, name, role, phoneNumber } = req.body ?? {};
  if (!eventId || !name || !role || !phoneNumber) {
    res.status(400).json({ error: "eventId, name, role, and phoneNumber are all required" });
    return;
  }
  const event = await getEventById(eventId, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const vendor = await addVendor({ eventId, name, role, phoneNumber });
  res.status(201).json({ vendor });
});

vendorsRouter.get("/templates", (_req, res) => {
  res.json({ templates: MESSAGE_TEMPLATES });
});

// Sends one plan_update to every vendor on the event that isn't already
// confirmed, reusing the same send + logging path as a single manual send.
// Confirmed vendors are skipped so a bulk reminder never re-pesters someone
// who has already said yes.
vendorsRouter.post("/bulk-reminder", async (req, res) => {
  const { eventId } = req.body ?? {};
  if (!eventId) {
    res.status(400).json({ error: "eventId is required" });
    return;
  }
  const event = await getEventById(eventId, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const profile = await getPlannerProfile(req.plannerId);
  if (profile?.whatsappEnabled === false) {
    res.status(400).json({ error: "WhatsApp integration is turned off in Settings, turn it on to send reminders." });
    return;
  }
  if (profile?.vendorFollowUps === false) {
    res.status(400).json({ error: "Vendor follow-ups are turned off in Settings, turn them on to send a bulk reminder." });
    return;
  }

  // Vendors and their messages in one nested query for the pre-check,
  // instead of one computeVendorStatus (and one messages query) per vendor
  // before any sending even starts.
  const vendors = (await getVendorStatusesForPlanner(req.plannerId, true, eventId))
    .filter(({ status }) => status !== "confirmed")
    .map(({ vendor }) => vendor);
  const templateDef = MESSAGE_TEMPLATES.plan_update;
  let sent = 0;
  let failed = 0;

  for (const vendor of vendors) {
    const params = [
      vendor.name,
      event.coupleNames ?? "the couple",
      "Checking in on where things stand, please confirm at your earliest convenience.",
    ];
    const previewBody = `[${templateDef.name}] ${params.join(" / ")}`;

    try {
      const { waMessageId } = await sendTemplateMessage(
        vendor.phoneNumber,
        templateDef.name,
        templateDef.languageCode,
        params,
      );
      await addMessage({
        vendorId: vendor.id,
        direction: "outbound",
        body: previewBody,
        templateName: templateDef.name,
        waMessageId,
        deliveryStatus: "sent",
      });
      sent += 1;
    } catch (error) {
      const reason = error instanceof WhatsAppSendError ? error.message : "Could not send that message right now.";
      await addMessage({
        vendorId: vendor.id,
        direction: "outbound",
        body: previewBody,
        templateName: templateDef.name,
        deliveryStatus: "failed",
        errorReason: reason,
      });
      failed += 1;
    }
  }

  trackEvent("vendor_bulk_reminder_sent", { eventId, sent, failed });
  res.json({ sent, failed });
});

vendorsRouter.get("/:id/messages", async (req, res) => {
  const vendor = await getVendorById(req.params.id);
  if (!vendor || !(await getEventById(vendor.eventId, req.plannerId))) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json({ messages: await getMessagesForVendor(vendor.id) });
});

vendorsRouter.post("/:id/send", async (req, res) => {
  const vendor = await getVendorById(req.params.id);
  if (!vendor || !(await getEventById(vendor.eventId, req.plannerId))) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const profile = await getPlannerProfile(req.plannerId);
  if (profile?.whatsappEnabled === false) {
    res.status(400).json({ error: "WhatsApp integration is turned off in Settings, turn it on to send messages." });
    return;
  }

  const { templateName, params } = req.body ?? {};
  const templateDef = MESSAGE_TEMPLATES[templateName];
  if (!templateDef) {
    res.status(400).json({ error: "Unknown template name" });
    return;
  }
  if (!Array.isArray(params) || params.length !== templateDef.paramLabels.length) {
    res.status(400).json({
      error: `This template needs ${templateDef.paramLabels.length} values: ${templateDef.paramLabels.join(", ")}`,
    });
    return;
  }

  const previewBody = `[${templateDef.name}] ${params.join(" / ")}`;

  try {
    const { waMessageId } = await sendTemplateMessage(
      vendor.phoneNumber,
      templateDef.name,
      templateDef.languageCode,
      params,
    );

    const message = await addMessage({
      vendorId: vendor.id,
      direction: "outbound",
      body: previewBody,
      templateName: templateDef.name,
      waMessageId,
      deliveryStatus: "sent",
    });

    trackEvent("vendor_message_sent", { vendorId: vendor.id, templateName: templateDef.name });

    res.status(201).json({
      message,
      status: await computeVendorStatus(vendor.id, { vendorFollowUpsEnabled: profile?.vendorFollowUps ?? true }),
    });
  } catch (error) {
    const reason = error instanceof WhatsAppSendError ? error.message : "Could not send that message right now.";

    await addMessage({
      vendorId: vendor.id,
      direction: "outbound",
      body: previewBody,
      templateName: templateDef.name,
      deliveryStatus: "failed",
      errorReason: reason,
    });

    console.error("WhatsApp send failed:", reason);
    res.status(502).json({ error: reason });
  }
});
