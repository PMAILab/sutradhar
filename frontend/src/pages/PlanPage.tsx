import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlan } from "../context/PlanContext";
import { checkGaps, trackAnalyticsEvent, type Gap } from "../lib/api";
import { StatusPill } from "../components/StatusPill";

type GapsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; gaps: Gap[]; note?: string };

export function PlanPage() {
  const { plan, dismissedGapIds, dismissGap, updateCeremonyTasks, addTaskToCeremony } = usePlan();
  const navigate = useNavigate();
  const [activeCeremonyId, setActiveCeremonyId] = useState<string | null>(plan?.ceremonies[0]?.id ?? null);
  const [gapsState, setGapsState] = useState<GapsState>({ status: "loading" });
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    if (!plan) {
      navigate("/intake");
      return;
    }
    if (!activeCeremonyId) {
      setActiveCeremonyId(plan.ceremonies[0]?.id ?? null);
    }
  }, [plan, activeCeremonyId, navigate]);

  useEffect(() => {
    if (!plan) return;
    loadGaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, dismissedGapIds]);

  async function loadGaps() {
    if (!plan) return;
    setGapsState({ status: "loading" });
    try {
      const result = await checkGaps(plan, dismissedGapIds);
      setGapsState({ status: "loaded", gaps: result.gaps, note: result.note });
    } catch (error) {
      setGapsState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not check for gaps right now.",
      });
    }
  }

  if (!plan) return null;

  const activeCeremony = plan.ceremonies.find((c) => c.id === activeCeremonyId) ?? plan.ceremonies[0];

  function handleAddTask() {
    if (!activeCeremony || newTaskTitle.trim().length === 0) return;
    addTaskToCeremony(activeCeremony.id, newTaskTitle.trim());
    setNewTaskTitle("");
  }

  function handleAddGapToPlan(gap: Gap) {
    addTaskToCeremony(gap.ceremonyId, gap.label);
    dismissGap(gap.id);
    trackAnalyticsEvent("gap_confirmed", { gapId: gap.id, ceremonyName: gap.ceremonyName });
  }

  function handleDismissGap(gap: Gap) {
    dismissGap(gap.id);
    trackAnalyticsEvent("gap_dismissed", { gapId: gap.id, ceremonyName: gap.ceremonyName });
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Plan canvas */}
      <div className="flex-1 p-margin_desktop overflow-y-auto">
        <div className="mb-6">
          <h2 className="font-serif text-headline-sm text-primary">
            {plan.coupleNames ?? "Untitled wedding"}
          </h2>
          {plan.weddingDate && (
            <p className="font-sans text-body-sm text-on-surface-variant">{plan.weddingDate}</p>
          )}
        </div>

        {/* Ceremony tabs */}
        <div className="flex items-end gap-8 mb-10 border-b border-outline-variant overflow-x-auto">
          {plan.ceremonies.map((ceremony) => (
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
              <div className="bg-surface border border-outline-variant">
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
                          <button
                            onClick={() =>
                              updateCeremonyTasks(
                                activeCeremony.id,
                                task.id,
                                task.status === "confirmed" ? "pending" : "confirmed",
                              )
                            }
                          >
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
      <aside className="w-[400px] border-l border-outline-variant bg-surface flex flex-col p-gutter overflow-y-auto">
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
            <p className="font-sans text-body-sm text-on-surface-variant text-center pt-2">
              Checking for gaps...
            </p>
          </div>
        )}

        {gapsState.status === "error" && (
          <div className="bg-surface-container-low border border-outline-variant p-5 space-y-3">
            <p className="font-sans text-body-sm text-tertiary">{gapsState.message}</p>
            <button
              onClick={loadGaps}
              className="font-sans text-label-lg text-primary underline"
            >
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
