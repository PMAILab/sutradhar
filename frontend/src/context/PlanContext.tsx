import { createContext, useContext, useState, type ReactNode } from "react";
import type { StructuredPlan } from "../lib/api";

/**
 * Temporary in-session store until Supabase persistence lands. Plan and
 * dismissed gaps live only in memory for now, they reset on refresh.
 */
interface PlanContextValue {
  plan: StructuredPlan | null;
  setPlan: (plan: StructuredPlan) => void;
  dismissedGapIds: string[];
  dismissGap: (gapId: string) => void;
  updateCeremonyTasks: (ceremonyId: string, taskId: string, status: "pending" | "confirmed" | "needs_review") => void;
  addTaskToCeremony: (ceremonyId: string, title: string) => void;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<StructuredPlan | null>(null);
  const [dismissedGapIds, setDismissedGapIds] = useState<string[]>([]);

  function dismissGap(gapId: string) {
    setDismissedGapIds((prev) => (prev.includes(gapId) ? prev : [...prev, gapId]));
  }

  function updateCeremonyTasks(
    ceremonyId: string,
    taskId: string,
    status: "pending" | "confirmed" | "needs_review",
  ) {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ceremonies: prev.ceremonies.map((ceremony) =>
          ceremony.id === ceremonyId
            ? {
                ...ceremony,
                tasks: ceremony.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
              }
            : ceremony,
        ),
      };
    });
  }

  function addTaskToCeremony(ceremonyId: string, title: string) {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ceremonies: prev.ceremonies.map((ceremony) =>
          ceremony.id === ceremonyId
            ? {
                ...ceremony,
                tasks: [
                  ...ceremony.tasks,
                  {
                    id: `${ceremonyId}_task_${ceremony.tasks.length}_${Date.now()}`,
                    title,
                    vendor: null,
                    status: "pending" as const,
                  },
                ],
              }
            : ceremony,
        ),
      };
    });
  }

  return (
    <PlanContext.Provider
      value={{ plan, setPlan, dismissedGapIds, dismissGap, updateCeremonyTasks, addTaskToCeremony }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}
