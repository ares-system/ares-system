/**
 * Model factory for @ares/engine.
 *
 * Users pick a model by string identifier using the scheme:
 *
 *   <provider>:<model>[@<baseUrl>]
 *
 * Supported providers:
 *   - google        → Gemini via @langchain/google-genai     (needs GOOGLE_API_KEY)
 *   - openrouter    → OpenRouter via @langchain/openrouter   (needs OPENROUTER_API_KEY)
 *   - openai        → OpenAI or any OpenAI-compatible server (needs OPENAI_API_KEY
 *                     or ASST_OPENAI_API_KEY, plus optional OPENAI_BASE_URL)
 *   - ollama        → Ollama on localhost (or remote) — OpenAI-compatible shim.
 *                     Default base URL: http://localhost:11434/v1
 *   - local         → Alias for a user-provided OpenAI-compatible endpoint
 *                     (e.g. LM Studio, vLLM, LocalAI). Base URL must be supplied
 *                     via @baseUrl, OPENAI_BASE_URL, or ASST_LOCAL_BASE_URL.
 *
 * Examples:
 *   google:gemini-2.5-flash
 *   openrouter:nvidia/nemotron-nano-9b-v2:free
 *   openai:gpt-4o-mini
 *   ollama:llama3.1
 *   ollama:qwen2.5-coder@http://192.168.1.10:11434/v1
 *   local:mistral-7b@http://localhost:1234/v1
 *
 * Legacy short-form identifiers ("gemini-2.5-flash", "openai/gpt-oss-20b:free")
 * are accepted and mapped to google/openrouter for backward compatibility.
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";

export type ModelProvider = "google" | "openrouter" | "openai" | "ollama" | "local";

export interface ModelId {
  provider: ModelProvider;
  model: string;
  baseUrl?: string;
}

export const DEFAULT_ORCHESTRATOR_MODEL =
  process.env.ASST_ORCHESTRATOR_MODEL ?? "google:gemini-2.5-flash";

const OLLAMA_DEFAULT_BASE = "http://localhost:11434/v1";

/**
 * Parse a model identifier. Accepts both the new "<provider>:<model>" scheme
 * and legacy short-form strings (for backward compatibility).
 */
export function parseModelId(raw: string): ModelId {
  if (!raw || typeof raw !== "string") {
    throw new Error(`Invalid model id: ${raw}`);
  }

  // New scheme: "<provider>:<model>[@<baseUrl>]"
  const atSplit = raw.split("@");
  const head = atSplit[0];
  const baseUrl = atSplit.slice(1).join("@") || undefined;

  const colonIdx = head.indexOf(":");
  if (colonIdx > 0) {
    const maybeProvider = head.slice(0, colonIdx);
    if (isKnownProvider(maybeProvider)) {
      return {
        provider: maybeProvider,
        model: head.slice(colonIdx + 1),
        baseUrl,
      };
    }
  }

  // Legacy detection: strings without provider prefix.
  if (/^gemini/i.test(raw)) return { provider: "google", model: raw };
  if (raw.includes("/")) return { provider: "openrouter", model: raw };
  if (/^gpt-/i.test(raw)) return { provider: "openai", model: raw };

  // Default to OpenRouter — cheapest catch-all.
  return { provider: "openrouter", model: raw };
}

function isKnownProvider(s: string): s is ModelProvider {
  return (
    s === "google" ||
    s === "openrouter" ||
    s === "openai" ||
    s === "ollama" ||
    s === "local"
  );
}

export interface CreateModelOptions {
  temperature?: number;
  apiKey?: string;
  /** Additional provider-specific fields, forwarded as-is. */
  extra?: Record<string, unknown>;
}

/**
 * Construct a LangChain chat model from an identifier.
 *
 * Throws if the required env var for the chosen provider is missing.
 */
export function createModel(
  id: string | ModelId,
  opts: CreateModelOptions = {},
): any {
  const parsed = typeof id === "string" ? parseModelId(id) : id;
  const temperature = opts.temperature ?? 0.1;

  switch (parsed.provider) {
    case "google": {
      const apiKey = opts.apiKey ?? process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GOOGLE_API_KEY is required for google: models. Get one at https://aistudio.google.com/apikey",
        );
      }
      return new ChatGoogleGenerativeAI({
        model: parsed.model,
        apiKey,
        temperature,
        ...(opts.extra ?? {}),
      });
    }

    case "openrouter": {
      const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OPENROUTER_API_KEY is required for openrouter: models. Get one at https://openrouter.ai/keys",
        );
      }
      return new ChatOpenRouter({
        model: parsed.model,
        apiKey,
        temperature,
        ...(opts.extra ?? {}),
      });
    }

    case "openai": {
      const apiKey =
        opts.apiKey ??
        process.env.OPENAI_API_KEY ??
        process.env.ASST_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY (or ASST_OPENAI_API_KEY) is required for openai: models.",
        );
      }
      const baseURL =
        parsed.baseUrl ?? process.env.OPENAI_BASE_URL ?? undefined;
      return new ChatOpenAI({
        model: parsed.model,
        apiKey,
        temperature,
        ...(baseURL ? { configuration: { baseURL } } : {}),
        ...(opts.extra ?? {}),
      });
    }

    case "ollama": {
      const baseURL =
        parsed.baseUrl ??
        process.env.OLLAMA_BASE_URL ??
        process.env.ASST_OLLAMA_BASE_URL ??
        OLLAMA_DEFAULT_BASE;
      // Ollama exposes an OpenAI-compatible API at /v1 — we just talk to that.
      return new ChatOpenAI({
        model: parsed.model,
        apiKey: opts.apiKey ?? "ollama", // Ollama ignores the key
        temperature,
        configuration: { baseURL },
        ...(opts.extra ?? {}),
      });
    }

    case "local": {
      const baseURL =
        parsed.baseUrl ??
        process.env.OPENAI_BASE_URL ??
        process.env.ASST_LOCAL_BASE_URL;
      if (!baseURL) {
        throw new Error(
          "local: provider requires @baseUrl, OPENAI_BASE_URL, or ASST_LOCAL_BASE_URL. " +
            "Example: local:mistral-7b@http://localhost:1234/v1",
        );
      }
      return new ChatOpenAI({
        model: parsed.model,
        apiKey:
          opts.apiKey ??
          process.env.OPENAI_API_KEY ??
          process.env.ASST_LOCAL_API_KEY ??
          "local",
        temperature,
        configuration: { baseURL },
        ...(opts.extra ?? {}),
      });
    }

    default: {
      const never: never = parsed.provider;
      throw new Error(`Unhandled provider: ${never}`);
    }
  }
}
