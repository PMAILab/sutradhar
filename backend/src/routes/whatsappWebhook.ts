import { Router } from "express";
import { env } from "../config/env.js";
import { findVendorByPhone, addMessage, findMessageByWaId, computeVendorStatus } from "../data/store.js";
import { trackEvent } from "../lib/analytics.js";
import type { DeliveryStatus } from "../data/store.js";

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.whatsappVerifyToken) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

interface InboundMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  type: string;
}

interface StatusUpdate {
  id: string;
  status: string;
  recipient_id: string;
  timestamp: string;
}

interface WebhookValue {
  messages?: InboundMessage[];
  statuses?: StatusUpdate[];
}

whatsappWebhookRouter.post("/", (req, res) => {
  // Ack immediately, Meta expects a fast 200 regardless of processing outcome.
  res.sendStatus(200);

  try {
    const entries = req.body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value: WebhookValue = change.value ?? {};
        handleInboundMessages(value.messages ?? []);
        handleStatusUpdates(value.statuses ?? []);
      }
    }
  } catch (error) {
    console.error("Failed to process WhatsApp webhook payload:", error);
  }
});

function handleInboundMessages(inboundMessages: InboundMessage[]) {
  for (const inbound of inboundMessages) {
    if (inbound.type !== "text" || !inbound.text) continue;

    const vendor = findVendorByPhone(inbound.from);
    if (!vendor) {
      console.log(`Received WhatsApp reply from unknown number ${inbound.from}, ignoring.`);
      continue;
    }

    addMessage({
      vendorId: vendor.id,
      direction: "inbound",
      body: inbound.text.body,
      waMessageId: inbound.id,
      timestamp: new Date(Number(inbound.timestamp) * 1000).toISOString(),
    });

    const status = computeVendorStatus(vendor.id);
    if (status === "confirmed") {
      trackEvent("vendor_confirmed", { vendorId: vendor.id });
    }
  }
}

function handleStatusUpdates(statusUpdates: StatusUpdate[]) {
  const knownStatuses: DeliveryStatus[] = ["sent", "delivered", "read", "failed"];

  for (const update of statusUpdates) {
    const message = findMessageByWaId(update.id);
    if (!message) continue;
    if (knownStatuses.includes(update.status as DeliveryStatus)) {
      message.deliveryStatus = update.status as DeliveryStatus;
    }
  }
}
