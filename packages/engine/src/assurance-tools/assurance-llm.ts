import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/** Default OpenRouter model for Assurance Run / ASST (override with `OPENROUTER_MODEL`). */
export const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

/** Default Gemini model (free tier via Google AI Studio). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Thrown when the Assurance Run preset needs OpenRouter but `OPENROUTER_API_KEY` is missing.
 */
export class AssuranceRunOpenRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssuranceRunOpenRouterError";
  }
}

/**
 * Load `deepagentsjs/.env` and monorepo root `.env.local` into `process.env` when present.
 * Only sets keys that are not already defined.
 */
export function loadDeepagentsEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const deepagentsRoot = join(here, "..", "..");
  const monorepoRoot = join(deepagentsRoot, "..");

  // Try both .env locations
  for (const envPath of [join(deepagentsRoot, ".env"), join(monorepoRoot, ".env.local")]) {
    if (!existsSync(envPath)) continue;
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

export function getOpenRouterApiKey(): string | undefined {
  const k = process.env.OPENROUTER_API_KEY?.trim();
  return k || undefined;
}

export function getGeminiApiKey(): string | undefined {
  const k = process.env.GOOGLE_API_KEY?.trim();
  return k || undefined;
}

export interface AssuranceOpenRouterOptions {
  temperature?: number;
  maxTokens?: number;
}

function newChatOpenRouter(
  apiKey: string,
  options: AssuranceOpenRouterOptions,
  modelOverride?: string
): ChatOpenRouter {
  const modelId = (
    modelOverride ?? process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL
  ).trim();

  return new ChatOpenRouter({
    model: modelId,
    temperature: options.temperature ?? 0,
    maxTokens: options.maxTokens ?? 4096,
    apiKey,
  });
}

/**
 * Create a Gemini model via Google AI Studio (free tier).
 * Requires `GOOGLE_API_KEY` env var. Get one free at https://aistudio.google.com/apikey
 */
function newChatGemini(
  apiKey: string,
  options: AssuranceOpenRouterOptions,
  modelOverride?: string
): ChatGoogleGenerativeAI {
  const modelId = (modelOverride ?? DEFAULT_GEMINI_MODEL).trim();

  return new ChatGoogleGenerativeAI({
    model: modelId,
    temperature: options.temperature ?? 0,
    maxOutputTokens: options.maxTokens ?? 4096,
    apiKey,
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT" as any,
        threshold: "BLOCK_ONLY_HIGH" as any,
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH" as any,
        threshold: "BLOCK_ONLY_HIGH" as any,
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
        threshold: "BLOCK_ONLY_HIGH" as any,
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
        threshold: "BLOCK_ONLY_HIGH" as any,
      },
    ],
  });
}

/**
 * Unified model factory. Detects provider from model ID:
 * - "gemini-*" -> Google AI Studio (free, high rate limits)
 * - anything else -> OpenRouter
 */
export function createAssuranceRunChatModel(
  options: AssuranceOpenRouterOptions = {},
  modelOverride?: string
): ChatOpenRouter | ChatGoogleGenerativeAI {
  const modelId = modelOverride || "";

  // Route to Gemini if the model ID starts with "gemini"
  if (modelId.startsWith("gemini")) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new AssuranceRunOpenRouterError(
        "Gemini model requires GOOGLE_API_KEY. Get a free key at https://aistudio.google.com/apikey and add it to your .env.local",
      );
    }
    return newChatGemini(apiKey, options, modelId);
  }

  // Default: OpenRouter
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new AssuranceRunOpenRouterError(
      "Assurance Run requires OPENROUTER_API_KEY. Copy deepagentsjs/.env.example to deepagentsjs/.env and set your key (https://openrouter.ai/settings/keys).",
    );
  }
  return newChatOpenRouter(apiKey, options, modelOverride);
}

/**
 * Returns `ChatOpenRouter` when `OPENROUTER_API_KEY` is set; otherwise `undefined`.
 * Used by optional smoke scripts (skip with exit 0 when no key / no CI secret).
 */
export function tryCreateAssuranceOpenRouterModel(
  options: AssuranceOpenRouterOptions = {},
): ChatOpenRouter | undefined {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return undefined;
  return newChatOpenRouter(apiKey, options);
}
