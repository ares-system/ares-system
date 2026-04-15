// Test which free OpenRouter models support tool calling.
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage } from "@langchain/core/messages";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Manually load .env.local from monorepo root
const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "../../../.env.local");
const raw = readFileSync(envPath, "utf8");
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

const apiKey = process.env.OPENROUTER_API_KEY!;
console.log("API key loaded:", apiKey ? "YES (" + apiKey.slice(0, 12) + "...)" : "NO");

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

async function testModel(modelId: string) {
  try {
    const llm = new ChatOpenRouter({ model: modelId, apiKey, maxTokens: 50 });
    const bound = llm.bindTools([
      {
        type: "function" as const,
        function: {
          name: "dummy_test",
          description: "A dummy tool for testing",
          parameters: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
        },
      },
    ]);
    await bound.invoke([new HumanMessage("Call the dummy_test tool with input 'hello'")]);
    console.log(`YES  ${modelId}`);
  } catch (e: any) {
    const msg = e.message?.slice(0, 120) || "unknown";
    console.log(`NO   ${modelId}  =>  ${msg}`);
  }
}

async function main() {
  console.log("\nTesting free OpenRouter models for TOOL CALLING support...\n");
  for (const m of FREE_MODELS) {
    await testModel(m);
  }
  console.log("\nDone.");
}

main();
