import { Router } from "express";
import { getSupabase } from "../lib/supabaseClient.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPlannerProfile, updatePlannerProfile, type PlannerProfile } from "../data/plannersStore.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

function toResponse(name: string | undefined, profile: PlannerProfile | null) {
  return {
    name: name ?? null,
    phone: profile?.phone ?? null,
    language: profile?.language ?? "English (UK)",
    timezone: profile?.timezone ?? "IST (UTC+5:30)",
    whatsappEnabled: profile?.whatsappEnabled ?? true,
    vendorFollowUps: profile?.vendorFollowUps ?? true,
    dailySummary: profile?.dailySummary ?? true,
    browserPush: profile?.browserPush ?? true,
    aiInsights: profile?.aiInsights ?? false,
  };
}

profileRouter.get("/", async (req, res) => {
  const profile = await getPlannerProfile(req.plannerId);
  const { data } = await getSupabase().auth.admin.getUserById(req.plannerId);
  const name = (data.user?.user_metadata?.full_name as string | undefined) ?? undefined;
  res.json(toResponse(name, profile));
});

profileRouter.put("/", async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) || null : undefined;
  const language = typeof body.language === "string" ? body.language : undefined;
  const timezone = typeof body.timezone === "string" ? body.timezone : undefined;
  const whatsappEnabled = typeof body.whatsappEnabled === "boolean" ? body.whatsappEnabled : undefined;
  const vendorFollowUps = typeof body.vendorFollowUps === "boolean" ? body.vendorFollowUps : undefined;
  const dailySummary = typeof body.dailySummary === "boolean" ? body.dailySummary : undefined;
  const browserPush = typeof body.browserPush === "boolean" ? body.browserPush : undefined;
  const aiInsights = typeof body.aiInsights === "boolean" ? body.aiInsights : undefined;

  if (name) {
    const { error } = await getSupabase().auth.admin.updateUserById(req.plannerId, {
      user_metadata: { full_name: name },
    });
    if (error) {
      console.error("PUT /api/profile name update failed:", error);
      res.status(500).json({ error: "Could not update your name right now." });
      return;
    }
  }

  const profile = await updatePlannerProfile(req.plannerId, {
    phone,
    language,
    timezone,
    whatsappEnabled,
    vendorFollowUps,
    dailySummary,
    browserPush,
    aiInsights,
  });

  const { data } = await getSupabase().auth.admin.getUserById(req.plannerId);
  const currentName = (data.user?.user_metadata?.full_name as string | undefined) ?? undefined;
  res.json(toResponse(currentName, profile));
});
