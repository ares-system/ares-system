import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
/** Default OpenRouter model for Assurance Run / ASST (override with `OPENROUTER_MODEL`). */
export declare const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
/** Default Gemini model (free tier via Google AI Studio). */
export declare const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
/**
 * Thrown when the Assurance Run preset needs OpenRouter but `OPENROUTER_API_KEY` is missing.
 */
export declare class AssuranceRunOpenRouterError extends Error {
    constructor(message: string);
}
/**
 * Load `deepagentsjs/.env` and monorepo root `.env.local` into `process.env` when present.
 * Only sets keys that are not already defined.
 */
export declare function loadDeepagentsEnv(): void;
export declare function getOpenRouterApiKey(): string | undefined;
export declare function getGeminiApiKey(): string | undefined;
export interface AssuranceOpenRouterOptions {
    temperature?: number;
    maxTokens?: number;
}
/**
 * Unified model factory. Detects provider from model ID:
 * - "gemini-*" -> Google AI Studio (free, high rate limits)
 * - anything else -> OpenRouter
 */
export declare function createAssuranceRunChatModel(options?: AssuranceOpenRouterOptions, modelOverride?: string): ChatOpenRouter | ChatGoogleGenerativeAI;
/**
 * Returns `ChatOpenRouter` when `OPENROUTER_API_KEY` is set; otherwise `undefined`.
 * Used by optional smoke scripts (skip with exit 0 when no key / no CI secret).
 */
export declare function tryCreateAssuranceOpenRouterModel(options?: AssuranceOpenRouterOptions): ChatOpenRouter | undefined;
