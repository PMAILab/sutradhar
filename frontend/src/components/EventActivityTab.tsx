import { useEffect, useState } from "react";
import { getEventActivity, type ActivityItem } from "../lib/api";
import { Skeleton } from "./ui/Skeleton";
import { ErrorState } from "./ui/ErrorState";
import { EmptyState } from "./ui/EmptyState";

type ActivityState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; activity: ActivityItem[] };

export function EventActivityTab({ eventId }: { eventId: string }) {
  const [state, setState] = useState<ActivityState>({ status: "loading" });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function load() {
    setState({ status: "loading" });
    try {
      const { activity } = await getEventActivity(eventId);
      setState({ status: "loaded", activity });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load activity right now.",
      });
    }
  }

  return (
    <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto max-w-[720px]">
      <h3 className="font-serif text-headline-md text-on-surface mb-2">Activity</h3>
      <p className="font-sans text-body-sm text-on-surface-variant mb-8">
        Every WhatsApp message sent and received across this wedding's vendors, newest first.
      </p>

      {state.status === "loading" && (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {state.status === "error" && <ErrorState description={state.message} onRetry={load} />}

      {state.status === "loaded" && state.activity.length === 0 && (
        <EmptyState icon="forum" title="No activity yet" description="Messages sent to vendors will show up here." />
      )}

      {state.status === "loaded" && state.activity.length > 0 && (
        <ul className="space-y-4">
          {state.activity.map((item) => (
            <li
              key={item.id}
              className={`p-4 rounded-lg border border-outline-variant ${
                item.direction === "outbound" ? "bg-surface-container-lowest" : "bg-primary/5"
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1">
                <p className="font-sans text-label-lg text-on-surface">
                  {item.vendorName}
                  <span className="font-sans text-label-sm text-on-surface-variant"> · {item.vendorRole}</span>
                </p>
                <span className="font-sans text-label-sm text-on-surface-variant shrink-0">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="font-sans text-body-sm text-on-surface-variant">
                {item.direction === "outbound" ? "Sent: " : "Reply: "}
                {item.body}
              </p>
              {item.errorReason && (
                <p className="font-sans text-label-sm text-tertiary mt-1">Could not send: {item.errorReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
