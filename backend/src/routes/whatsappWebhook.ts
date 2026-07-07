import { Router } from "express";
import { env } from "../config/env.js";

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

whatsappWebhookRouter.post("/", (req, res) => {
  // Full parsing of message status and reply payloads lands in Phase 3.
  // For now, ack fast and log so we can see real Meta payloads arrive.
  console.log("WhatsApp webhook event:", JSON.stringify(req.body));
  res.sendStatus(200);
});
