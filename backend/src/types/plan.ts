import type { Tradition } from "../data/ceremonyKnowledgeBase.js";

export interface PlanTask {
  id: string;
  title: string;
  vendor: string | null;
  status: "pending" | "confirmed" | "needs_review";
}

export interface PlanCeremony {
  id: string;
  name: string;
  tasks: PlanTask[];
  notes: string | null;
}

export interface StructuredPlan {
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: Tradition | "unspecified";
  traditionConfidence: "high" | "medium" | "low";
  ceremonies: PlanCeremony[];
}

export interface Gap {
  id: string;
  ceremonyId: string;
  ceremonyName: string;
  label: string;
  reason: string;
  severity: "important" | "worth_checking";
}
