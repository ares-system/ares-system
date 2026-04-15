import { ChatOpenRouter } from "@langchain/openrouter";
import { loadDeepagentsEnv } from "./examples/assurance-tools/assurance-llm.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";

loadDeepagentsEnv();

const dummyTool = tool(async () => "ok", {
  name: "dummy_test",
  description: "A dummy tool for testing",
  schema: z.object({ input: z.string().describe("test input") }),
});

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

async function testModel(modelId: string) {
  try {
    const llm = new ChatOpenRouter({
      model: modelId,
      apiKey: process.env.OPENROUTER_API_KEY!,
      maxTokens: 50,
    });
    const bound = llm.bindTools([dummyTool]);
    const res = await bound.invoke([new HumanMessage("Call the dummy_test tool with input 'hello'")]);
    console.log(`YES ${modelId} — TOOL SUPPORT OK`);
  } catch (e: any) {
    const msg = e.message?.slice(0, 120) || "unknown error";
    console.log(`NO  ${modelId} — ${msg}`);
  }
}

async function main() {
  console.log("Testing free OpenRouter models for tool calling support...\n");
  for (const m of FREE_MODELS) {
    await testModel(m);
  }
}

main();
