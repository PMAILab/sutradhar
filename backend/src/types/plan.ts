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

export interface PlanConflict {
  id: string;
  description: string;
  options: string[];
  resolved: boolean;
  resolvedValue: string | null;
}

export interface StructuredPlan {
  coupleNames: string | null;
  weddingDate: string | null;
  // "unspecified" when intake found no real cultural signal, one of the
  // curated `Tradition` ids (ceremonyKnowledgeBase.ts) when it matches the
  // human-reviewed knowledge base, or any other free-text tradition intake
  // detected with real confidence (e.g. "bengali_hindu", "christian") —
  // Completeness Copilot falls back to AI-suggested gaps for anything
  // outside the curated set instead of skipping gap-checking entirely.
  tradition: string;
  traditionConfidence: "high" | "medium" | "low";
  ceremonies: PlanCeremony[];
  conflicts: PlanConflict[];
}

export interface Gap {
  id: string;
  ceremonyId: string;
  ceremonyName: string;
  label: string;
  reason: string;
  severity: "important" | "worth_checking";
  kbVersion: string;
  // "knowledge_base" gaps come from the human-reviewed ceremony knowledge
  // base; "ai_suggested" ones are generated on the fly by Gemini for a
  // tradition/ceremony the knowledge base doesn't cover yet, and haven't
  // been human-reviewed.
  source: "knowledge_base" | "ai_suggested";
}
