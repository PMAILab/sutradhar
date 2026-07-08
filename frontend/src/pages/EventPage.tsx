import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  checkGaps,
  trackAnalyticsEvent,
  getEvent,
  addTaskToCeremony,
  updateTaskStatus,
  dismissGapApi,
  markEventSuccessful,
  resolveConflict,
  type Gap,
  type WeddingEvent,
  type MarkSuccessfulWarning,
} from "../lib/api";
import { StatusPill } from "../components/StatusPill";

type GapsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; gaps: Gap[]; note?: string };

type EventState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; event: WeddingEvent };

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [eventState, setEventState] = useState<EventState>({ status: "loading" });
  const [activeCeremonyId, setActiveCeremonyId] = useState<string | null>(null);
  const [gapsState, setGapsState] = useState<GapsState>({ status: "loading" });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [successWarning, setSuccessWarning] = useState<MarkSuccessfulWarning | null>(null);

  useEffect(() => {
    if (id) loadEvent(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (eventState.status === "loaded") loadGaps(eventState.event.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventState.status === "loaded" ? eventState.event.id : null, eventState.status === "loaded" ? eventState.event.dismissedGapIds.length : 0]);

  async function loadEvent(eventId: string) {
    setEventState({ status: "loading" });
    try {
      const { event } = await getEvent(eventId);
      setEventState({ status: "loaded", event });
      setActiveCeremonyId((prev) => prev ?? event.ceremonies[0]?.id ?? null);
    } catch (error) {
      setEventState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load this wedding right now.",
      });
    }
  }

  async function loadGaps(eventId: string) {
    setGapsState({ status: "loading" });
    try {
      const result = await checkGaps(eventId);
      setGapsState({ status: "loaded", gaps: result.gaps, note: result.note });
    } catch (error) {
      setGapsState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not check for gaps right now.",
      });
    }
  }

  if (eventState.status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-20 w-64 bg-surface-container-low rounded animate-pulse" />
      </div>
    );
  }

  if (eventState.status === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="font-sans text-body-md text-tertiary">{eventState.message}</p>
        <button onClick={() => navigate("/dashboard")} className="font-sans text-label-lg text-primary underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const event = eventState.event;
  const activeCeremony = event.ceremonies.find((c) => c.id === activeCeremonyId) ?? event.ceremonies[0];

  const daysUntilWedding = event.weddingDate
    ? Math.ceil((new Date(event.weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  async function handleAddTask() {
    if (!activeCeremony || newTaskTitle.trim().length === 0) return;
    const { event: updated } = await addTaskToCeremony(event.id, activeCeremony.id, newTaskTitle.trim());
    setEventState({ status: "loaded", event: updated });
    setNewTaskTitle("");
  }

  async function handleToggleTaskStatus(ceremonyId: string, taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "confirmed" ? "pending" : "confirmed";
    const { event: updated } = await updateTaskStatus(event.id, taskId, ceremonyId, nextStatus as "pending" | "confirmed");
    setEventState({ status: "loaded", event: updated });
  }

  async function handleAddGapToPlan(gap: Gap) {
    await addTaskToCeremony(event.id, gap.ceremonyId, gap.label);
    const { event: updated } = await dismissGapApi(event.id, gap.id);
    setEventState({ status: "loaded", event: updated });
    trackAnalyticsEvent("gap_confirmed", { gapId: gap.id, ceremonyName: gap.ceremonyName });
  }

  async function handleDismissGap(gap: Gap) {
    const { event: updated } = await dismissGapApi(event.id, gap.id);
    setEventState({ status: "loaded", event: updated });
    trackAnalyticsEvent("gap_dismissed", { gapId: gap.id, ceremonyName: gap.ceremonyName });
  }

  async function handleMarkSuccessful() {
    const result = await markEventSuccessful(event.id, true);
    if ("warning" in result) {
      setSuccessWarning(result);
      return;
    }
    navigate(`/events/${event.id}/success`);
  }

  async function handleConfirmAnyway() {
    setSuccessWarning(null);
    const result = await markEventSuccessful(event.id, true, true);
    if (!("warning" in result)) {
      navigate(`/events/${event.id}/success`);
    }
  }

  async function handleResolveConflict(conflictId: string, resolvedValue: string) {
    const { event: updated } = await resolveConflict(event.id, conflictId, resolvedValue);
    setEventState({ status: "loaded", event: updated });
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Plan canvas */}
      <div className="flex-1 p-margin_mobile md:p-margin_desktop overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="font-serif text-headline-lg text-primary">{event.coupleNames ?? "Untitled wedding"}</h2>
            {event.weddingDate && (
              <p className="font-sans text-body-sm text-on-surface-variant">
                {event.weddingDate}
                {daysUntilWedding !== null && daysUntilWedding >= 0 && ` · ${daysUntilWedding} days to go`}
              </p>
            )}
            <Link
              to={`/vendors?eventId=${event.id}`}
              className="font-sans text-label-lg text-primary underline inline-block mt-2"
            >
              View vendors for this wedding
            </Link>
          </div>
          {event.successful ? (
            <span className="font-sans text-label-lg text-secondary">Marked successfully completed</span>
          ) : (
            <button
              onClick={handleMarkSuccessful}
              className="flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded font-sans text-label-lg hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Mark as successfully completed
            </button>
          )}
        </div>

        {successWarning && (
          <div className="mb-8 bg-surface-container-low border border-tertiary rounded-lg p-6 space-y-4">
            <p className="font-sans text-body-md text-on-surface">{successWarning.message}</p>
            {successWarning.problemVendors.length > 0 && (
              <ul className="font-sans text-body-sm text-on-surface-variant list-disc pl-5">
                {successWarning.problemVendors.map((v) => (
                  <li key={v.id}>
                    {v.name} ({v.role}), status: {v.status.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            )}
            {successWarning.unresolvedConflicts.length > 0 && (
              <ul className="font-sans text-body-sm text-on-surface-variant list-disc pl-5">
                {successWarning.unresolvedConflicts.map((c) => (
                  <li key={c.id}>{c.description}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleConfirmAnyway}
                className="px-6 py-2.5 bg-primary text-on-primary rounded font-sans text-label-lg hover:opacity-90"
              >
                Mark successful anyway
              </button>
              <button
                onClick={() => setSuccessWarning(null)}
                className="px-6 py-2.5 border border-outline rounded font-sans text-label-lg text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {event.conflicts.some((c) => !c.resolved) && (
          <div className="mb-8 bg-surface-container-low border border-tertiary rounded-lg p-6 space-y-4">
            <p className="font-sans text-label-lg text-tertiary uppercase tracking-widest">
              Needs your confirmation
            </p>
            {event.conflicts
              .filter((c) => !c.resolved)
              .map((conflict) => (
                <div key={conflict.id} className="space-y-2">
                  <p className="font-sans text-body-md text-on-surface">{conflict.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {conflict.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleResolveConflict(conflict.id, option)}
                        className="px-4 py-2 border border-outline rounded font-sans text-label-sm text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Ceremony tabs */}
        <div className="flex items-end gap-8 mb-10 border-b border-outline-variant overflow-x-auto">
          {event.ceremonies.map((ceremony) => (
            <button
              key={ceremony.id}
              onClick={() => setActiveCeremonyId(ceremony.id)}
              className={`pb-4 font-serif text-headline-sm whitespace-nowrap border-b-2 transition-all ${
                ceremony.id === activeCeremony?.id
                  ? "text-primary border-primary font-semibold"
                  : "text-on-surface-variant border-transparent hover:text-on-surface"
              }`}
            >
              {ceremony.name}
            </button>
          ))}
        </div>

        {activeCeremony && (
          <section className="space-y-gutter">
            <h3 className="font-serif text-headline-md text-on-surface">{activeCeremony.name}</h3>
            {activeCeremony.notes && (
              <p className="font-sans text-body-sm text-on-surface-variant italic">{activeCeremony.notes}</p>
            )}

            {activeCeremony.tasks.length === 0 ? (
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-8 text-center">
                <p className="font-sans text-body-md text-on-surface-variant">
                  No tasks yet for {activeCeremony.name}. Add one below, or let the Copilot suggest what's usually
                  needed.
                </p>
              </div>
            ) : (
              <div className="bg-surface border border-outline-variant overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                        Task
                      </th>
                      <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-gutter py-4 font-sans text-label-sm text-on-surface-variant uppercase tracking-widest">
                        Vendor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {activeCeremony.tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-gutter py-6 font-sans text-body-md font-medium">{task.title}</td>
                        <td className="px-gutter py-6">
                          <button onClick={() => handleToggleTaskStatus(activeCeremony.id, task.id, task.status)}>
                            <StatusPill status={task.status} />
                          </button>
                        </td>
                        <td className="px-gutter py-6 font-sans text-body-sm">
                          {task.vendor ?? <span className="italic text-on-surface-variant">Not assigned</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3">
              <input
                className="flex-1 px-4 py-3 bg-transparent border border-outline-variant focus:border-primary focus:ring-0 outline-none font-sans text-body-md rounded-lg"
                placeholder="Add a task to this ceremony"
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleAddTask()}
              />
              <button
                onClick={handleAddTask}
                className="px-6 py-3 bg-primary text-on-primary font-sans text-label-lg rounded-lg hover:bg-primary-container transition-colors"
              >
                Add
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Copilot side panel */}
      <aside className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-outline-variant bg-surface flex flex-col p-gutter overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary-container rounded-full">
            <span className="material-symbols-outlined text-on-primary-container">auto_awesome</span>
          </div>
          <div>
            <h4 className="font-serif text-headline-sm">A few things worth checking</h4>
            <p className="font-sans text-label-sm text-on-surface-variant">Completeness Copilot</p>
          </div>
        </div>

        {gapsState.status === "loading" && (
          <div className="space-y-4">
            <div className="h-20 bg-surface-container-low rounded-lg animate-pulse" />
            <div className="h-20 bg-surface-container-low rounded-lg animate-pulse" />
            <p className="font-sans text-body-sm text-on-surface-variant text-center pt-2">Checking for gaps...</p>
          </div>
        )}

        {gapsState.status === "error" && (
          <div className="bg-surface-container-low border border-outline-variant p-5 space-y-3">
            <p className="font-sans text-body-sm text-tertiary">{gapsState.message}</p>
            <button onClick={() => loadGaps(event.id)} className="font-sans text-label-lg text-primary underline">
              Try again
            </button>
          </div>
        )}

        {gapsState.status === "loaded" && gapsState.gaps.length === 0 && (
          <div className="bg-surface-container-low border border-outline-variant p-5">
            <p className="font-sans text-body-sm text-on-surface-variant">
              {gapsState.note ?? "Nothing flagged right now, the plan looks complete for what's been added so far."}
            </p>
          </div>
        )}

        {gapsState.status === "loaded" && gapsState.gaps.length > 0 && (
          <div className="space-y-6">
            {gapsState.gaps.map((gap) => (
              <div key={gap.id} className="bg-surface-container-low border border-outline-variant p-5 space-y-4">
                <p className="font-sans text-body-md leading-relaxed">
                  <strong className={gap.severity === "important" ? "text-tertiary" : "text-primary"}>
                    {gap.ceremonyName}:
                  </strong>{" "}
                  {gap.reason}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAddGapToPlan(gap)}
                    className="flex-1 py-3 px-4 bg-primary text-on-primary font-sans text-label-lg hover:opacity-90 active:scale-95 transition-all"
                  >
                    Add to plan
                  </button>
                  <button
                    onClick={() => handleDismissGap(gap)}
                    className="px-4 py-3 border border-outline font-sans text-label-lg text-on-surface hover:bg-surface-container transition-all"
                  >
                    Not relevant
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
