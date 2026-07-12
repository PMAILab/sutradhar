import { GoogleGenAI, ApiError } from "@google/genai";
import { env } from "../config/env.js";

export function isGeminiConfigured(): boolean {
  return Boolean(env.geminiApiKey);
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error("VERTEX_API_KEY is not set");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.geminiApiKey, vertexai: true });
  }
  return client;
}

// Vertex AI's publisher-model catalog doesn't carry the "-latest" alias
// (404s), unlike the Gemini Developer API — pin a real Vertex model id.
// gemini-2.5-pro 404s under Vertex AI Express (API-key) mode in some
// regions (e.g. asia-southeast1) where it isn't GA yet — gemini-2.5-flash
// has broader regional availability and is fully capable of the
// structured-JSON tasks this file is used for.
const MODEL = "gemini-2.5-flash";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's own error copy for 503 says "usually temporary... try again
// later" — retrying once, briefly, before giving up to the caller's
// fallback turns a lot of these into a normal-looking response instead of
// a fallback the planner has to notice and work around.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function generateOnce<T>(prompt: string): Promise<T> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini returned a response that was not valid JSON");
  }
}

export async function generateJson<T>(prompt: string): Promise<T> {
  try {
    return await generateOnce<T>(prompt);
  } catch (error) {
    const retryable = error instanceof ApiError && RETRYABLE_STATUSES.has(error.status);
    if (!retryable) throw error;
    await sleep(2000);
    return generateOnce<T>(prompt);
  }
}
