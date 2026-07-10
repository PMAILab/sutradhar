import type { Request, Response, NextFunction } from "express";
import { getSupabase } from "../lib/supabaseClient.js";
import { resolveUser } from "../lib/session.js";

/** Attaches `req.plannerId` and calls next() for a real, authenticated
 *  session (sd_at/sd_rt cookies); 401s otherwise. Mock mode (no Supabase
 *  configured) never satisfies this — mock sessions only ever back the
 *  auth UI itself (see routes/auth.ts), not real event/vendor/message data,
 *  since that data genuinely lives in Supabase with no local fallback. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await resolveUser(req, res);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  // Belt-and-suspenders for the auth.users -> sutradhar.planners mirror:
  // the DB trigger only fires on new signups, so any account created before
  // the trigger existed (or before a schema reset) has no planners row,
  // which then fails every events insert on its planner_id FK. Upserting
  // here means a stale trigger can never brick a real user.
  const { error: upsertError } = await getSupabase()
    .from("planners")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  if (upsertError) {
    res.status(500).json({ error: "Could not verify your planner account, try again in a moment." });
    return;
  }

  req.plannerId = user.id;
  next();
}
