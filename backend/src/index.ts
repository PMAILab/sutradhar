import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { whatsappWebhookRouter } from "./routes/whatsappWebhook.js";
import { intakeRouter } from "./routes/intake.js";
import { copilotRouter } from "./routes/copilot.js";
import { vendorsRouter } from "./routes/vendors.js";
import { analyticsRouter } from "./routes/analytics.js";

const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "sutradhar-backend" });
});

app.use("/webhooks/whatsapp", whatsappWebhookRouter);
app.use("/api/intake", intakeRouter);
app.use("/api/copilot", copilotRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/analytics", analyticsRouter);

app.listen(env.port, () => {
  console.log(`Sutradhar backend listening on port ${env.port}`);
});
