import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, type DashboardUrgentItem, type EventSummary } from "../lib/api";

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
  const [state, setState] = useState<DashboardState>({ status: "loading" });

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
    <div className="flex-1 p-margin_desktop overflow-y-auto max-w-container_max mx-auto w-full">
      <section className="mb-12">
        <h2 className="font-serif text-display-lg text-primary leading-tight mb-2">Good morning.</h2>
        <p className="font-serif text-headline-sm text-on-surface-variant italic">
          Here's what needs you today.
        </p>
      </section>

      {state.status === "loading" && (
        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="h-24 bg-surface-container-low rounded-lg animate-pulse" />
            <div className="h-24 bg-surface-container-low rounded-lg animate-pulse" />
          </div>
          <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-gutter">
            <div className="h-48 bg-surface-container-low rounded-xl animate-pulse" />
            <div className="h-48 bg-surface-container-low rounded-xl animate-pulse" />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="bg-surface-container-low border border-outline-variant p-6 rounded space-y-3 max-w-md">
          <p className="font-sans text-body-sm text-tertiary">{state.message}</p>
          <button onClick={load} className="font-sans text-label-lg text-primary underline">
            Try again
          </button>
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
              <div className="p-6 bg-surface-container-low border border-outline-variant rounded-lg">
                <p className="font-sans text-body-sm text-on-surface-variant">
                  Nothing urgent right now. New gaps, overdue vendors, and approaching dates will show up here.
                </p>
              </div>
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
            </div>

            {state.events.length === 0 ? (
              <div className="p-10 bg-surface-container-low border border-outline-variant rounded-xl text-center">
                <p className="font-sans text-body-md text-on-surface-variant mb-4">
                  No active weddings yet. Start a new client intake to see it here.
                </p>
                <Link to="/intake" className="font-sans text-label-lg text-primary underline">
                  Start a new intake
                </Link>
              </div>
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

function EventCard({ event }: { event: EventSummary }) {
  const percent = event.progress.total > 0 ? Math.round((event.progress.confirmed / event.progress.total) * 100) : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group bg-surface-container-lowest border border-outline-variant p-8 rounded-xl transition-all hover:shadow-xl hover:-translate-y-1"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="font-serif text-headline-sm text-on-surface mb-1">
            {event.coupleNames ?? "Untitled wedding"}
          </h4>
          <p className="font-sans text-body-sm text-on-surface-variant">{event.weddingDate ?? "Date not set"}</p>
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle className="text-surface-container" cx="24" cy="24" fill="transparent" r={radius} stroke="currentColor" strokeWidth="4" />
            <circle
              className="text-primary"
              cx="24"
              cy="24"
              fill="transparent"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-primary">{percent}%</span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-outline-variant/30">
          <span className="font-sans text-body-sm text-on-surface-variant">Vendors confirmed</span>
          <span className="font-sans text-label-sm text-secondary">
            {event.vendorSummary.confirmed} / {event.vendorSummary.total}
          </span>
        </div>
        {event.vendorSummary.needsAttention > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-outline-variant/30">
            <span className="font-sans text-body-sm text-on-surface-variant">Need attention</span>
            <span className="font-sans text-label-sm text-tertiary">{event.vendorSummary.needsAttention}</span>
          </div>
        )}
        {event.lastGapCount > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-outline-variant/30">
            <span className="font-sans text-body-sm text-on-surface-variant">Gaps to review</span>
            <span className="font-sans text-label-sm text-tertiary">{event.lastGapCount}</span>
          </div>
        )}
      </div>

      <span className="font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
        {event.tradition === "unspecified" ? "Tradition not confirmed" : event.tradition.replace(/_/g, " ")}
      </span>
    </Link>
  );
}
