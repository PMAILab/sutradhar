import { Router } from "express";
import { generateJson, isGeminiConfigured } from "../lib/gemini.js";
import { trackEvent } from "../lib/analytics.js";
import { addEvent } from "../data/eventsStore.js";
import type { StructuredPlan } from "../types/plan.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const intakeRouter = Router();
intakeRouter.use(requireAuth);

const KNOWN_CEREMONY_NAMES = [
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Wedding",
  "Reception",
  "Nikah",
  "Walima",
  "Anand Karaj",
];

interface RawGeminiCeremony {
  name: string;
  notes?: string;
  tasks?: { title: string; vendor?: string; status?: string }[];
}

interface RawGeminiConflict {
  description: string;
  options: string[];
}

interface RawGeminiPlan {
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: string;
  traditionConfidence: string;
  ceremonies: RawGeminiCeremony[];
  conflicts?: RawGeminiConflict[];
}

function buildPrompt(rawText: string): string {
  return `You are helping a professional wedding planner turn a messy client brief into a structured, ceremony by ceremony plan. Be conservative: only include a ceremony if the text actually mentions or clearly implies it. Do not invent details that are not present in the text.

Known ceremony names to use when they match (use these exact names, do not invent new spellings): ${KNOWN_CEREMONY_NAMES.join(", ")}. If a ceremony is mentioned that doesn't match any of these, still include it under its own name.

Identify which wedding tradition this appears to be, choosing exactly one of: "hindu_north_indian", "muslim_nikah", "sikh_anand_karaj", or "unspecified" if the text gives no clear religious or cultural signal. Do not guess a religion from names alone unless the text gives an actual signal (an explicit ceremony name, a explicit mention of religion, etc). If unsure, use "unspecified" and set traditionConfidence to "low".

The brief may come from more than one family member and contain contradictions, two different dates for the same event, two different names for the same vendor role, conflicting instructions about the same thing. When you find a real contradiction, do not silently pick one side. Instead, resolve the plan using your best read of the most likely correct value, but also list the contradiction in "conflicts" so the planner can confirm it themselves. Do not invent a conflict that isn't actually there, only flag a genuine contradiction between two stated facts.

Return strictly valid JSON matching this shape, no markdown, no commentary:
{
  "coupleNames": string or null,
  "weddingDate": string or null (ISO date if a specific date is mentioned, else null),
  "tradition": one of "hindu_north_indian" | "muslim_nikah" | "sikh_anand_karaj" | "unspecified",
  "traditionConfidence": "high" | "medium" | "low",
  "ceremonies": [
    {
      "name": string,
      "notes": string or null (anything relevant that doesn't fit a task),
      "tasks": [
        { "title": string, "vendor": string or null, "status": "pending" | "confirmed" | "needs_review" }
      ]
    }
  ],
  "conflicts": [
    {
      "description": string (plain description of the contradiction, e.g. "The bride's mother said the caterer is Grand Catering, but a later message says it's still undecided"),
      "options": string[] (the distinct conflicting values found in the text, 2 or more)
    }
  ]
}

Client brief to structure:
"""
${rawText}
"""`;
}

/** Zero-AI fallback: never fail an intake closed. Drops the whole brief
 *  into one "Review this brief" ceremony as a single task rather than
 *  losing the planner's paste entirely — used both when GEMINI_API_KEY
 *  isn't set (local dev/demo) and when a real Gemini call fails (quota,
 *  outage). The planner loses structuring, not their client's brief. */
function fallbackPlan(rawText: string): StructuredPlan {
  return {
    coupleNames: null,
    weddingDate: null,
    tradition: "unspecified",
    traditionConfidence: "low",
    ceremonies: [
      {
        id: "ceremony_0_review_this_brief",
        name: "Review this brief",
        notes: "Structuring wasn't available when this was pasted in, so nothing's been split into ceremonies yet. Read the brief below and add ceremonies and tasks manually, or come back and try again shortly.",
        tasks: [
          {
            id: "ceremony_0_task_0",
            title: rawText.length > 500 ? `${rawText.slice(0, 500)}…` : rawText,
            vendor: null,
            status: "needs_review",
          },
        ],
      },
    ],
    conflicts: [],
  };
}

intakeRouter.post("/parse", async (req, res) => {
  const rawText = req.body?.rawText;

  if (typeof rawText !== "string" || rawText.trim().length < 10) {
    res.status(400).json({ error: "rawText must be a string with real content" });
    return;
  }

  let structuredPlan: StructuredPlan;
  let fallback = false;

  if (!isGeminiConfigured()) {
    structuredPlan = fallbackPlan(rawText);
    fallback = true;
  } else {
    try {
      const raw = await generateJson<RawGeminiPlan>(buildPrompt(rawText));

      const validTraditions = ["hindu_north_indian", "muslim_nikah", "sikh_anand_karaj", "unspecified"];
      const tradition = validTraditions.includes(raw.tradition) ? raw.tradition : "unspecified";
      const traditionConfidence = ["high", "medium", "low"].includes(raw.traditionConfidence)
        ? raw.traditionConfidence
        : "low";

      structuredPlan = {
        coupleNames: raw.coupleNames ?? null,
        weddingDate: raw.weddingDate ?? null,
        tradition: tradition as StructuredPlan["tradition"],
        traditionConfidence: traditionConfidence as StructuredPlan["traditionConfidence"],
        ceremonies: (raw.ceremonies ?? []).map((ceremony, ceremonyIndex) => ({
          id: `ceremony_${ceremonyIndex}_${ceremony.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          name: ceremony.name,
          notes: ceremony.notes ?? null,
          tasks: (ceremony.tasks ?? []).map((task, taskIndex) => ({
            id: `ceremony_${ceremonyIndex}_task_${taskIndex}`,
            title: task.title,
            vendor: task.vendor ?? null,
            status: (["pending", "confirmed", "needs_review"].includes(task.status ?? "")
              ? task.status
              : "pending") as "pending" | "confirmed" | "needs_review",
          })),
        })),
        conflicts: (raw.conflicts ?? []).map((conflict, conflictIndex) => ({
          id: `conflict_${conflictIndex}_${Date.now()}`,
          description: conflict.description,
          options: conflict.options ?? [],
          resolved: false,
          resolvedValue: null,
        })),
      };
    } catch (error) {
      console.error("Intake parse failed, falling back to a review ceremony:", error);
      structuredPlan = fallbackPlan(rawText);
      fallback = true;
    }
  }

  trackEvent("structured_plan_generated", {
    tradition: structuredPlan.tradition,
    ceremonyCount: structuredPlan.ceremonies.length,
    fallback,
  });

  const event = await addEvent(structuredPlan, req.plannerId);

  res.json({ event, fallback });
});
