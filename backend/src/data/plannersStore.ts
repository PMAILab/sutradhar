import { getSupabase } from "../lib/supabaseClient.js";

export interface PlannerProfile {
  phone: string | null;
  language: string;
  timezone: string;
  whatsappEnabled: boolean;
  vendorFollowUps: boolean;
  dailySummary: boolean;
  browserPush: boolean;
  aiInsights: boolean;
}

interface PlannerRow {
  phone: string | null;
  language: string;
  timezone: string;
  whatsapp_enabled: boolean;
  vendor_follow_ups: boolean;
  daily_summary: boolean;
  browser_push: boolean;
  ai_insights: boolean;
}

function mapRow(row: PlannerRow): PlannerProfile {
  return {
    phone: row.phone,
    language: row.language,
    timezone: row.timezone,
    whatsappEnabled: row.whatsapp_enabled,
    vendorFollowUps: row.vendor_follow_ups,
    dailySummary: row.daily_summary,
    browserPush: row.browser_push,
    aiInsights: row.ai_insights,
  };
}

// The on_auth_user_created trigger inserts a bare planners row at signup
// time, so this should always find one — maybeSingle (not single) only as a
// guard against a stale account from before that trigger existed.
export async function getPlannerProfile(plannerId: string): Promise<PlannerProfile | null> {
  const { data, error } = await getSupabase()
    .from("planners")
    .select("phone, language, timezone, whatsapp_enabled, vendor_follow_ups, daily_summary, browser_push, ai_insights")
    .eq("id", plannerId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function updatePlannerProfile(plannerId: string, patch: Partial<PlannerProfile>): Promise<PlannerProfile> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.language !== undefined) row.language = patch.language;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;
  if (patch.whatsappEnabled !== undefined) row.whatsapp_enabled = patch.whatsappEnabled;
  if (patch.vendorFollowUps !== undefined) row.vendor_follow_ups = patch.vendorFollowUps;
  if (patch.dailySummary !== undefined) row.daily_summary = patch.dailySummary;
  if (patch.browserPush !== undefined) row.browser_push = patch.browserPush;
  if (patch.aiInsights !== undefined) row.ai_insights = patch.aiInsights;

  const { data, error } = await getSupabase()
    .from("planners")
    .update(row)
    .eq("id", plannerId)
    .select("phone, language, timezone, whatsapp_enabled, vendor_follow_ups, daily_summary, browser_push, ai_insights")
    .single();
  if (error) throw error;
  return mapRow(data);
}
