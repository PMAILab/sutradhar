import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEvents, type EventSummary } from "../lib/api";
import { EventCard } from "../components/EventCard";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; events: EventSummary[] };

export function EventsPage() {
  const [state, setState] = useState<ListState>({ status: "loading" });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setState({ status: "loading" });
    try {
      const { events } = await listEvents();
      setState({ status: "loaded", events });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load your weddings right now.",
      });
    }
  }

  return (
    <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto max-w-container_max mx-auto w-full">
      <header className="mb-10">
        <h2 className="font-serif text-headline-lg text-primary mb-2">Weddings</h2>
        <p className="font-sans text-body-md text-on-surface-variant">
          Every active and completed wedding you're planning, in one place.
        </p>
      </header>

      {state.status === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      )}

      {state.status === "error" && (
        <div className="max-w-md">
          <ErrorState description={state.message} onRetry={load} />
        </div>
      )}

      {state.status === "loaded" && state.events.length === 0 && (
        <div className="max-w-lg">
          <EmptyState
            icon="celebration"
            title="No weddings yet"
            description="Start a new client intake to see it here."
            action={
              <Link to="/intake" className="font-sans text-label-lg text-primary underline">
                Start a new intake
              </Link>
            }
          />
        </div>
      )}

      {state.status === "loaded" && state.events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
    </div>
  );
}
