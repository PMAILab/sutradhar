import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, type DashboardUrgentItem, type EventSummary } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { plannerDisplayName } from "../lib/user";
import { EventCard } from "../components/EventCard";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; urgentItems: DashboardUrgentItem[]; events: EventSummary[] };

const TIER_STYLE: Record<number, { border: string; dot: string; text: string }> = {
  1: { border: "border-tertiary", dot: "bg-tertiary", text: "text-tertiary" },
  2: { border: "border-primary", dot: "bg-primary", text: "text-primary" },
  3: { border: "border-secondary", dot: "bg-secondary", text: "text-secondary" },
};

export function DashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const name = plannerDisplayName(user);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setState({ status: "loading" });
    try {
      const { urgentItems, events } = await getDashboard();
      setState({ status: "loaded", urgentItems, events });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load the dashboard right now.",
      });
    }
  }

  return (
    <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto max-w-container_max mx-auto w-full">
      <section className="mb-12">
        <h2 className="font-serif text-display-lg text-primary leading-tight mb-2">
          {timeOfDayGreeting()}{name ? `, ${name}` : ""}.
        </h2>
        <p className="font-serif text-headline-sm text-on-surface-variant italic">
          Here's what needs you today.
        </p>
      </section>

      {state.status === "loading" && (
        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-gutter">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="max-w-md">
          <ErrorState description={state.message} onRetry={load} />
        </div>
      )}

      {state.status === "loaded" && (
        <div className="grid grid-cols-12 gap-gutter">
          {/* Urgent items */}
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-tertiary">priority_high</span>
              <h3 className="font-serif text-headline-md text-on-surface">Urgent items</h3>
            </div>

            {state.urgentItems.length === 0 && (
              <EmptyState
                icon="check_circle"
                title="Nothing urgent"
                description="New gaps, overdue vendors, and approaching dates will show up here."
              />
            )}

            {state.urgentItems.map((item) => {
              const style = TIER_STYLE[item.tier];
              return (
                <Link
                  key={item.id}
                  to={`/events/${item.eventId}`}
                  className={`block p-6 bg-surface-container-low border-l-4 ${style.border} rounded-r-xl border-y border-r border-outline-variant transition-transform hover:translate-x-1`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    <span className={`font-sans text-label-sm uppercase tracking-widest ${style.text}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="font-sans text-body-md text-on-surface font-semibold leading-relaxed">
                    {item.label}
                  </p>
                </Link>
              );
            })}
          </aside>

          {/* Active events grid */}
          <section className="col-span-12 lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-headline-md text-on-surface">Active weddings</h3>
              <Link to="/events" className="font-sans text-label-lg text-primary underline">
                View all
              </Link>
            </div>

            {state.events.length === 0 ? (
              <EmptyState
                icon="celebration"
                title="No active weddings yet"
                description="Start a new client intake to see it here."
                action={
                  <Link to="/intake" className="font-sans text-label-lg text-primary underline">
                    Start a new intake
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {state.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                <Link
                  to="/intake"
                  className="border-2 border-dashed border-outline-variant p-8 rounded-xl flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined text-[48px] mb-4">add_circle</span>
                  <span className="font-sans text-label-lg">Onboard new couple</span>
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
