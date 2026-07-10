import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

/** Server-side Supabase client (service role). Null when unconfigured, so
 *  this backend can still boot with zero keys — auth falls back to mock
 *  cookies (see routes/auth.ts, lib/session.ts) and the health check can
 *  report what's live instead of the whole process crashing at import time. */
export const supabase: SupabaseClient<any, any, "sutradhar", any, any> | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      db: { schema: "sutradhar" },
      auth: { persistSession: false },
    })
  : null;

/** Every real event/vendor/message route sits behind requireAuth, which
 *  already 401s before reaching any data-layer call once Supabase auth
 *  itself isn't configured (see requireAuth.ts) — that data genuinely has
 *  no local fallback, unlike the auth mock mode above. So this throwing is
 *  a should-never-happen guard against that invariant breaking, not a path
 *  real traffic is expected to hit. */
export function getSupabase(): SupabaseClient<any, any, "sutradhar", any, any> {
  if (!supabase) {
    throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
  }
  return supabase;
}
