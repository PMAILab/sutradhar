import { Router } from "express";
import { generateJson } from "../lib/gemini.js";
import type { StructuredPlan } from "../types/plan.js";

export const intakeRouter = Router();

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

interface RawGeminiPlan {
  coupleNames: string | null;
  weddingDate: string | null;
  tradition: string;
  traditionConfidence: string;
  ceremonies: RawGeminiCeremony[];
}

function buildPrompt(rawText: string): string {
  return `You are helping a professional wedding planner turn a messy client brief into a structured, ceremony by ceremony plan. Be conservative: only include a ceremony if the text actually mentions or clearly implies it. Do not invent details that are not present in the text.

Known ceremony names to use when they match (use these exact names, do not invent new spellings): ${KNOWN_CEREMONY_NAMES.join(", ")}. If a ceremony is mentioned that doesn't match any of these, still include it under its own name.

Identify which wedding tradition this appears to be, choosing exactly one of: "hindu_north_indian", "muslim_nikah", "sikh_anand_karaj", or "unspecified" if the text gives no clear religious or cultural signal. Do not guess a religion from names alone unless the text gives an actual signal (an explicit ceremony name, a explicit mention of religion, etc). If unsure, use "unspecified" and set traditionConfidence to "low".

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
  ]
}

Client brief to structure:
"""
${rawText}
"""`;
}

intakeRouter.post("/parse", async (req, res) => {
  const rawText = req.body?.rawText;

  if (typeof rawText !== "string" || rawText.trim().length < 10) {
    res.status(400).json({ error: "rawText must be a string with real content" });
    return;
  }

  try {
    const raw = await generateJson<RawGeminiPlan>(buildPrompt(rawText));

    const validTraditions = ["hindu_north_indian", "muslim_nikah", "sikh_anand_karaj", "unspecified"];
    const tradition = validTraditions.includes(raw.tradition) ? raw.tradition : "unspecified";
    const traditionConfidence = ["high", "medium", "low"].includes(raw.traditionConfidence)
      ? raw.traditionConfidence
      : "low";

    const structuredPlan: StructuredPlan = {
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
    };

    res.json({ plan: structuredPlan });
  } catch (error) {
    console.error("Intake parse failed:", error);
    res.status(502).json({ error: "Could not read that brief right now, try again in a moment." });
  }
});
