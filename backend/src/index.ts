import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { whatsappWebhookRouter } from "./routes/whatsappWebhook.js";
import { intakeRouter } from "./routes/intake.js";
import { copilotRouter } from "./routes/copilot.js";
import { vendorsRouter } from "./routes/vendors.js";
import { analyticsRouter } from "./routes/analytics.js";
import { eventsRouter } from "./routes/events.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { isSupabaseAuthConfigured } from "./lib/authClient.js";
import { isSupabaseConfigured } from "./lib/supabaseClient.js";
import { FRONTEND_ORIGIN } from "./lib/origins.js";

const app = express();

// Required so req.protocol/req.get('host') report the real public scheme
// (https) behind Render's TLS-terminating reverse proxy — the OAuth
// redirectTo URL built from these must match what's allow-listed in
// Supabase, or Google sign-in breaks in production.
app.set("trust proxy", 1);

// Reflects the request origin (or pins to FRONTEND_ORIGIN when set) with
// credentials allowed — required for the Netlify-hosted frontend's fetch
// calls to send/receive the httpOnly session cookie across origins. A
// wildcard origin (the old default) can't be combined with credentials.
app.use(cors({ origin: FRONTEND_ORIGIN || true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Reports which integrations are live vs. running on fallbacks, so a
// deploy (or a zero-key local demo) can be sanity-checked without guessing.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sutradhar-backend",
    timestamp: new Date().toISOString(),
    integrations: {
      supabase: isSupabaseConfigured,
      authConfigured: isSupabaseAuthConfigured,
      gemini: Boolean(env.geminiApiKey),
      whatsapp: Boolean(env.whatsappAccessToken && env.whatsappPhoneNumberId),
    },
  });
});

app.use("/webhooks/whatsapp", whatsappWebhookRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/intake", intakeRouter);
app.use("/api/copilot", copilotRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/dashboard", dashboardRouter);

// Any error thrown in a route (including rejected async handlers, which
// Express 5 forwards here) becomes a clean JSON body the frontend can parse,
// instead of Express's default HTML stack-trace page.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled route error:", err);
  const message = err instanceof Error ? err.message : "Something went wrong on our end.";
  res.status(500).json({ error: message });
});

app.listen(env.port, () => {
  console.log(`Sutradhar backend listening on port ${env.port}`);
});
