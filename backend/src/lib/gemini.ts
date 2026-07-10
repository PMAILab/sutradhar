import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

export function isGeminiConfigured(): boolean {
  return Boolean(env.geminiApiKey);
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return client;
}

// "-latest" alias, not a pinned version: pinned Gemini model ids get
// retired from new-user access on a rolling basis (gemini-2.5-flash and
// gemini-2.5-flash-lite both 404 as of July 2026), the alias stays current.
const MODEL = "gemini-flash-latest";

export async function generateJson<T>(prompt: string): Promise<T> {
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
