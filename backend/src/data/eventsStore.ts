import type { StructuredPlan, PlanCeremony } from "../types/plan.js";

/**
 * Same in-memory stopgap as vendors and messages, until Supabase lands.
 * An Event is a single wedding: the structured plan plus the bits the
 * Prioritization Engine and North Star need to track over time.
 */
export interface WeddingEvent extends StructuredPlan {
  id: string;
  createdAt: string;
  dismissedGapIds: string[];
  lastGapCount: number;
  completedAt: string | null;
  successful: boolean | null;
}

export const events: WeddingEvent[] = [];
let eventCounter = 0;

export function addEvent(plan: StructuredPlan): WeddingEvent {
  eventCounter += 1;
  const event: WeddingEvent = {
    id: `event_${eventCounter}`,
    createdAt: new Date().toISOString(),
    dismissedGapIds: [],
    lastGapCount: 0,
    completedAt: null,
    successful: null,
    ...plan,
  };
  events.push(event);
  return event;
}

export function listEvents(): WeddingEvent[] {
  return events;
}

export function getEventById(id: string): WeddingEvent | undefined {
  return events.find((e) => e.id === id);
}

export function updateCeremonies(eventId: string, ceremonies: PlanCeremony[]): void {
  const event = getEventById(eventId);
  if (event) event.ceremonies = ceremonies;
}

export function setDismissedGapIds(eventId: string, ids: string[]): void {
  const event = getEventById(eventId);
  if (event) event.dismissedGapIds = ids;
}

export function setLastGapCount(eventId: string, count: number): void {
  const event = getEventById(eventId);
  if (event) event.lastGapCount = count;
}

export function markEventSuccessful(eventId: string, successful: boolean): WeddingEvent | undefined {
  const event = getEventById(eventId);
  if (!event) return undefined;
  event.completedAt = new Date().toISOString();
  event.successful = successful;
  return event;
}

export function planTaskProgress(event: WeddingEvent): { confirmed: number; total: number } {
  let confirmed = 0;
  let total = 0;
  for (const ceremony of event.ceremonies) {
    for (const task of ceremony.tasks) {
      total += 1;
      if (task.status === "confirmed") confirmed += 1;
    }
  }
  return { confirmed, total };
}
