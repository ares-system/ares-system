import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ChatOpenRouter } from "@langchain/openrouter";

/** Default OpenRouter model for Assurance Run / ASST (override with `OPENROUTER_MODEL`). */
export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5";

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
 * Load `deepagentsjs/.env` into `process.env` when present (no `dotenv` dependency).
 * Only sets keys that are not already defined.
 */
export function loadDeepagentsEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const deepagentsRoot = join(here, "..", "..");
  const envPath = join(deepagentsRoot, ".env");
  if (!existsSync(envPath)) return;
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

export function getOpenRouterApiKey(): string | undefined {
  const k = process.env.OPENROUTER_API_KEY?.trim();
  return k || undefined;
}

export interface AssuranceOpenRouterOptions {
  temperature?: number;
  maxTokens?: number;
}

function newChatOpenRouter(
  apiKey: string,
  options: AssuranceOpenRouterOptions,
): ChatOpenRouter {
  const modelId = (
    process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL
  ).trim();

  return new ChatOpenRouter({
    model: modelId,
    temperature: options.temperature ?? 0,
    maxTokens: options.maxTokens ?? 4096,
    apiKey,
  });
}

/**
 * **Assurance Run preset LLM:** returns `ChatOpenRouter` from `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`.
 * Call {@link loadDeepagentsEnv} first (e.g. from `createAssuranceRunSolanaAgent`) so `deepagentsjs/.env` is loaded.
 *
 * @throws {AssuranceRunOpenRouterError} if `OPENROUTER_API_KEY` is unset — this preset does not fall back to another provider.
 */
export function createAssuranceRunChatModel(
  options: AssuranceOpenRouterOptions = {},
): ChatOpenRouter {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new AssuranceRunOpenRouterError(
      "Assurance Run requires OPENROUTER_API_KEY. Copy deepagentsjs/.env.example to deepagentsjs/.env and set your key (https://openrouter.ai/settings/keys).",
    );
  }
  return newChatOpenRouter(apiKey, options);
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
