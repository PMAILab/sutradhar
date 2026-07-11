import { Router } from "express";
import { generateJson, isGeminiConfigured } from "../lib/gemini.js";
import { getOrSet } from "../lib/cache.js";
import { trackEvent } from "../lib/analytics.js";
import { getCeremonyDefinition, KNOWLEDGE_BASE_VERSION, type Tradition } from "../data/ceremonyKnowledgeBase.js";
import { getEventById, setLastGapCount } from "../data/eventsStore.js";
import { getPlannerProfile } from "../data/plannersStore.js";
import type { StructuredPlan, Gap } from "../types/plan.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const copilotRouter = Router();
copilotRouter.use(requireAuth);

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
  const eventId = req.body?.eventId as string | undefined;
  if (!eventId) {
    res.status(400).json({ error: "eventId is required" });
    return;
  }

  const event = await getEventById(eventId, req.plannerId);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const profile = await getPlannerProfile(req.plannerId);
  if (!(profile?.aiInsights ?? false)) {
    await setLastGapCount(eventId, 0);
    res.json({
      gaps: [],
      knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
      note: "AI insights & tips is turned off in Settings, turn it on to see Completeness Copilot suggestions here.",
    });
    return;
  }

  const plan: StructuredPlan = event;
  const dismissedGapIds = event.dismissedGapIds;

  if (plan.tradition === "unspecified") {
    res.json({
      gaps: [],
      knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
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
    await setLastGapCount(eventId, 0);
    res.json({ gaps: [], knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION });
    return;
  }

  const COVERAGE_TTL_MS = 10 * 60 * 1000; // repeat visits to the same event within a session cost zero extra calls
  const COVERAGE_FALLBACK_TTL_MS = 90 * 1000; // a quota blip shouldn't keep every candidate flagged for a full 10 minutes once it recovers

  // Includes the plan's own task content, not just the event id — a stale
  // cache entry from before a task was added/edited would otherwise judge
  // coverage against the old plan. Self-invalidating: the key simply
  // changes when the plan does, no manual invalidation needed.
  const planFingerprint = plan.ceremonies
    .map((c) => `${c.id}:${c.tasks.map((t) => `${t.title}|${t.status}`).join(",")}`)
    .join(";");
  const cacheKey = `checkGaps:${eventId}:${planFingerprint}:${dismissedGapIds.join(",")}`;

  const { coveredIds, fallback } = await getOrSet(
    cacheKey,
    (v) => (v.fallback ? COVERAGE_FALLBACK_TTL_MS : COVERAGE_TTL_MS),
    async (): Promise<{ coveredIds: Set<string>; fallback: boolean }> => {
      if (!isGeminiConfigured()) {
        // No AI available to judge coverage: treat every candidate as an
        // unconfirmed gap rather than hiding the Completeness Copilot
        // entirely — matches this route's own philosophy ("if in doubt,
        // leave it out, so it surfaces as a gap"), just applied to a total
        // AI outage instead of a single uncertain item.
        return { coveredIds: new Set(), fallback: true };
      }
      try {
        const coverage = await generateJson<CoverageResult>(buildCoveragePrompt(plan, candidates));
        return { coveredIds: new Set(coverage.covered ?? []), fallback: false };
      } catch (error) {
        console.error("Completeness check failed, falling back to flag-everything:", error);
        return { coveredIds: new Set(), fallback: true };
      }
    },
  );

  const gaps: Gap[] = candidates
    .filter((c) => !coveredIds.has(c.checklistItemId))
    .map((c) => ({
      id: c.checklistItemId,
      ceremonyId: c.ceremonyId,
      ceremonyName: c.ceremonyName,
      label: c.label,
      reason: c.reason,
      severity: c.severity,
      kbVersion: KNOWLEDGE_BASE_VERSION,
    }));

  await setLastGapCount(eventId, gaps.length);

  if (gaps.length > 0) {
    trackEvent("gap_flagged", { count: gaps.length, ceremonyNames: [...new Set(gaps.map((g) => g.ceremonyName))] });
  }

  res.json({
    gaps,
    knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
    fallback,
    note: fallback
      ? "Structuring help wasn't available for this check, so everything below is unfiltered, some may already be covered in your plan."
      : undefined,
  });
});
