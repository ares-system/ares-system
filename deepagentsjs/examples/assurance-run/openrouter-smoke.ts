#!/usr/bin/env node
/**
 * Optional smoke test: LangChain ChatOpenRouter + createDeepAgent (Assurance Run / ASST primary LLM path).
 *
 * Docs: https://docs.langchain.com/oss/javascript/integrations/chat/openrouter
 *
 * Usage (from deepagentsjs/):
 *   pnpm exec tsx examples/assurance-run/openrouter-smoke.ts
 *
 * Env (see ../../.env.example):
 *   OPENROUTER_API_KEY — required to run (skipped with exit 0 if unset)
 *   OPENROUTER_MODEL — optional, default anthropic/claude-sonnet-4.5
 */
import { HumanMessage } from "@langchain/core/messages";
import { createDeepAgent, StateBackend } from "deepagents";

import {
  loadDeepagentsEnv,
  tryCreateAssuranceOpenRouterModel,
} from "../assurance-tools/assurance-llm.js";

async function main(): Promise<void> {
  loadDeepagentsEnv();

  const model = tryCreateAssuranceOpenRouterModel({
    maxTokens: 256,
  });

  if (!model) {
    console.log(
      "Assurance Run OpenRouter smoke: skipped (set OPENROUTER_API_KEY in deepagentsjs/.env)",
    );
    process.exit(0);
  }

  const direct = await model.invoke([
    new HumanMessage("Reply with a single word: ok (no other text)."),
  ]);
  const text =
    typeof direct.content === "string"
      ? direct.content
      : JSON.stringify(direct.content);
  console.log("ChatOpenRouter:", text.trim());

  const agent = createDeepAgent({
    model,
    backend: new StateBackend(),
  });

  const result = await agent.invoke(
    {
      messages: [
        new HumanMessage("Reply with a single word: ok (no other text)."),
      ],
    },
    { recursionLimit: 25 },
  );

  const msgs = result.messages ?? [];
  const last = msgs[msgs.length - 1];
  const agentText =
    last && "content" in last && typeof last.content === "string"
      ? last.content
      : JSON.stringify(last);
  console.log("createDeepAgent:", String(agentText).trim());
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
