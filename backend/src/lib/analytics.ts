/**
 * Stub analytics logger. Swap the body of trackEvent for an insert into
 * Supabase's analytics_events table once that's set up, the call sites
 * and event names stay the same.
 */
export type AnalyticsEventName =
  | "structured_plan_generated"
  | "gap_flagged"
  | "gap_confirmed"
  | "gap_dismissed"
  | "vendor_message_sent"
  | "vendor_confirmed"
  | "vendor_escalated"
  | "event_marked_successful";

export function trackEvent(name: AnalyticsEventName, properties: Record<string, unknown> = {}): void {
  console.log(`[analytics] ${name}`, JSON.stringify(properties));
}
