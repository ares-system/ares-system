import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter } from "@langchain/openrouter";
import { createDeepAgent } from "deepagents";
import { registerDeepAgentRunner } from "./deepagent.js";

const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5";

function createOpenRouterChatModel(): ChatOpenRouter {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OpenRouter eval runner requires OPENROUTER_API_KEY (see deepagentsjs/.env.example).",
    );
  }
  const modelId =
    process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  return new ChatOpenRouter({
    model: modelId,
    apiKey,
    temperature: 0,
    maxTokens: 4096,
  });
}

/** ASST primary path: LangChain ChatOpenRouter (same defaults as Assurance Run examples). */
registerDeepAgentRunner("openrouter", (config) =>
  createDeepAgent({
    ...config,
    model: createOpenRouterChatModel(),
  }),
);

registerDeepAgentRunner("sonnet-4-5", (config) =>
  createDeepAgent({
    ...config,
    model: new ChatAnthropic({ model: "claude-sonnet-4-5-20250929" }),
  }),
);

registerDeepAgentRunner("sonnet-4-5-thinking", (config) =>
  createDeepAgent({
    ...config,
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      thinking: { type: "enabled", budget_tokens: 5000 },
    }),
  }),
);

registerDeepAgentRunner("opus-4-6", (config) =>
  createDeepAgent({
    ...config,
    model: new ChatAnthropic({ model: "claude-opus-4-6" }),
  }),
);

registerDeepAgentRunner("sonnet-4-6", (config) =>
  createDeepAgent({
    ...config,
    model: new ChatAnthropic({ model: "claude-sonnet-4-6" }),
  }),
);

registerDeepAgentRunner("gpt-4.1", (config) =>
  createDeepAgent({ ...config, model: new ChatOpenAI({ model: "gpt-4.1" }) }),
);

registerDeepAgentRunner("gpt-4.1-mini", (config) =>
  createDeepAgent({
    ...config,
    model: new ChatOpenAI({ model: "gpt-4.1-mini" }),
  }),
);

registerDeepAgentRunner("o3-mini", (config) =>
  createDeepAgent({ ...config, model: new ChatOpenAI({ model: "o3-mini" }) }),
);
