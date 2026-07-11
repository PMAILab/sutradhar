import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { env } from "../config/env.js";

export type AnalyticsEventName =
  | "structured_plan_generated"
  | "gap_flagged"
  | "gap_confirmed"
  | "gap_dismissed"
  | "vendor_message_sent"
  | "vendor_bulk_reminder_sent"
  | "vendor_confirmed"
  | "vendor_escalated"
  | "event_marked_successful"
  | "event_deleted";

/** Best-effort, never blocks or fails the caller. Persists to
 *  sutradhar.analytics_events when Supabase is configured; otherwise logs
 *  to the console outside prod, so local dev without keys still shows
 *  what would have been tracked. */
export function trackEvent(name: AnalyticsEventName, properties: Record<string, unknown> = {}): void {
  if (isSupabaseConfigured && supabase) {
    supabase
      .from("analytics_events")
      .insert({ event_type: name, event_data: JSON.stringify(properties) })
      .then(({ error }) => {
        if (error) console.error("analytics insert failed:", error);
      });
    return;
  }
  if (!env.isProd) {
    console.log(`[analytics] ${name}`, JSON.stringify(properties));
  }
}
