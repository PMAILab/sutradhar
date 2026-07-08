import { Router } from "express";
import {
  addVendor,
  vendors,
  getVendorById,
  addMessage,
  getMessagesForVendor,
  computeVendorStatus,
  markEscalatedIfNew,
} from "../data/store.js";
import { MESSAGE_TEMPLATES } from "../data/messageTemplates.js";
import { sendTemplateMessage, WhatsAppSendError } from "../lib/whatsapp.js";
import { trackEvent } from "../lib/analytics.js";

export const vendorsRouter = Router();

vendorsRouter.get("/", (_req, res) => {
  const withStatus = vendors.map((vendor) => {
    const status = computeVendorStatus(vendor.id);
    if (status === "needs_attention" && markEscalatedIfNew(vendor.id)) {
      trackEvent("vendor_escalated", { vendorId: vendor.id });
    }
    return {
      ...vendor,
      status,
      lastMessage: getMessagesForVendor(vendor.id).at(-1) ?? null,
    };
  });
  res.json({ vendors: withStatus });
});

vendorsRouter.post("/", (req, res) => {
  const { name, role, phoneNumber } = req.body ?? {};
  if (!name || !role || !phoneNumber) {
    res.status(400).json({ error: "name, role, and phoneNumber are all required" });
    return;
  }
  const vendor = addVendor({ name, role, phoneNumber });
  res.status(201).json({ vendor });
});

vendorsRouter.get("/templates", (_req, res) => {
  res.json({ templates: MESSAGE_TEMPLATES });
});

vendorsRouter.get("/:id/messages", (req, res) => {
  const vendor = getVendorById(req.params.id);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json({ messages: getMessagesForVendor(vendor.id) });
});

vendorsRouter.post("/:id/send", async (req, res) => {
  const vendor = getVendorById(req.params.id);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
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

    const message = addMessage({
      vendorId: vendor.id,
      direction: "outbound",
      body: previewBody,
      templateName: templateDef.name,
      waMessageId,
      deliveryStatus: "sent",
    });

    trackEvent("vendor_message_sent", { vendorId: vendor.id, templateName: templateDef.name });

    res.status(201).json({ message, status: computeVendorStatus(vendor.id) });
  } catch (error) {
    const reason = error instanceof WhatsAppSendError ? error.message : "Could not send that message right now.";

    addMessage({
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
