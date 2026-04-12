/**
 * Run the echo graph without the Agent Server (no LANGSMITH_API_KEY needed).
 */
import { HumanMessage } from "@langchain/core/messages";

import { graph } from "./graph.js";

const input = process.argv.slice(2).join(" ") || "Hello from run-local";

const result = await graph.invoke(
  { messages: [new HumanMessage(input)] },
  { configurable: { thread_id: "cli-thread" } },
);

const last = result.messages.at(-1);
const out =
  last && typeof (last as { content?: unknown }).content === "string"
    ? (last as { content: string }).content
    : String(last);
console.log(out);
