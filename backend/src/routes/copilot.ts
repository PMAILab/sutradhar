import { Router } from "express";
import { generateJson } from "../lib/gemini.js";
import { getCeremonyDefinition, type Tradition } from "../data/ceremonyKnowledgeBase.js";
import type { StructuredPlan, Gap } from "../types/plan.js";

export const copilotRouter = Router();

interface CandidateGap {
  ceremonyId: string;
  ceremonyName: string;
  checklistItemId: string;
  label: string;
  reason: string;
  severity: "important" | "worth_checking";
}

interface CoverageResult {
  covered: string[];
}

function buildCoveragePrompt(plan: StructuredPlan, candidates: CandidateGap[]): string {
  const ceremonyContext = plan.ceremonies.map((ceremony) => ({
    ceremonyId: ceremony.id,
    name: ceremony.name,
    notes: ceremony.notes,
    tasks: ceremony.tasks.map((t) => ({ title: t.title, vendor: t.vendor, status: t.status })),
  }));

  const candidateList = candidates.map((c) => ({
    checklistItemId: c.checklistItemId,
    ceremonyId: c.ceremonyId,
    label: c.label,
  }));

  return `You are checking a wedding planner's structured plan against a checklist of things that are commonly needed for specific ceremonies. Your only job is to decide, for each checklist item, whether the planner's existing tasks or notes for that ceremony already clearly address it. Do not judge cultural correctness, that part is already handled. Only judge whether the existing plan text covers the item.

Here is the planner's current plan, ceremony by ceremony:
${JSON.stringify(ceremonyContext, null, 2)}

Here is the checklist to check against, each tied to a specific ceremonyId:
${JSON.stringify(candidateList, null, 2)}

Return strictly valid JSON, no markdown, no commentary:
{
  "covered": ["checklistItemId", ...]
}

Only include a checklistItemId in "covered" if the matching ceremony's tasks or notes clearly already address it. If in doubt, leave it out, so it surfaces as a gap for the planner to review rather than being silently hidden.`;
}

copilotRouter.post("/check-gaps", async (req, res) => {
  const plan = req.body?.plan as StructuredPlan | undefined;
  const dismissedGapIds: string[] = Array.isArray(req.body?.dismissedGapIds) ? req.body.dismissedGapIds : [];

  if (!plan || !Array.isArray(plan.ceremonies)) {
    res.status(400).json({ error: "plan with a ceremonies array is required" });
    return;
  }

  if (plan.tradition === "unspecified") {
    res.json({
      gaps: [],
      note: "The wedding's religion or region wasn't clear from the intake, so gap checking is paused. Confirm the tradition on the plan to turn this on.",
    });
    return;
  }

  const tradition = plan.tradition as Tradition;
  const candidates: CandidateGap[] = [];

  for (const ceremony of plan.ceremonies) {
    const definition = getCeremonyDefinition(tradition, ceremony.name);
    if (!definition) continue;

    for (const item of definition.checklist) {
      const gapId = `${ceremony.id}__${item.id}`;
      if (dismissedGapIds.includes(gapId)) continue;

      candidates.push({
        ceremonyId: ceremony.id,
        ceremonyName: ceremony.name,
        checklistItemId: gapId,
        label: item.label,
        reason: item.reason,
        severity: item.severity,
      });
    }
  }

  if (candidates.length === 0) {
    res.json({ gaps: [] });
    return;
  }

  try {
    const coverage = await generateJson<CoverageResult>(buildCoveragePrompt(plan, candidates));
    const coveredIds = new Set(coverage.covered ?? []);

    const gaps: Gap[] = candidates
      .filter((c) => !coveredIds.has(c.checklistItemId))
      .map((c) => ({
        id: c.checklistItemId,
        ceremonyId: c.ceremonyId,
        ceremonyName: c.ceremonyName,
        label: c.label,
        reason: c.reason,
        severity: c.severity,
      }));

    res.json({ gaps });
  } catch (error) {
    console.error("Completeness check failed:", error);
    res.status(502).json({ error: "Could not check for gaps right now, try again in a moment." });
  }
});
