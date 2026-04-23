import { createAssuranceRunSolanaAgent } from "./assurance-run-agent.js";
import { HumanMessage } from "@langchain/core/messages";
import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), "../.env.local"), quiet: true });
// Free models that support tool calling, ordered by reliability.
// Gemini uses Google AI Studio (independent rate limits from OpenRouter).
// OpenRouter models share Venice provider rate limits.
const TOOL_CAPABLE_FREE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-001",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-coder:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
];
/**
 * Robustly converts LangChain message content to a string.
 * Handles Gemini's "parts" array and standard strings.
 */
function formatMessageContent(content) {
    if (typeof content === "string")
        return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
            if (typeof part === "string")
                return part;
            if (part.text)
                return part.text;
            if (part.type === "text")
                return part.text;
            // Ignore tool calls/parts for the final text summary
            return "";
        })
            .join("")
            .trim();
    }
    return String(content || "");
}
async function runWithRetry(prompt, preferredToolModel) {
    // Build ordered list: user's preferred model first, then the rest as fallbacks
    const models = preferredToolModel
        ? [preferredToolModel, ...TOOL_CAPABLE_FREE_MODELS.filter(m => m !== preferredToolModel)]
        : [...TOOL_CAPABLE_FREE_MODELS];
    const MAX_ROUNDS = 3;
    for (let round = 0; round < MAX_ROUNDS; round++) {
        for (let i = 0; i < models.length; i++) {
            const modelId = models[i];
            const agent = createAssuranceRunSolanaAgent(modelId, modelId);
            try {
                const response = await agent.invoke({
                    messages: [new HumanMessage(prompt)],
                });
                // Find the last AI message that actually contains text.
                // LangChain agents with tools often have a ToolMessage as the last item,
                // but we want the AI's final summary that followed the tools.
                const messages = response.messages || [];
                let finalOutput = "";
                // Iterate backwards to find the last AI response with text
                for (let j = messages.length - 1; j >= 0; j--) {
                    const msg = messages[j];
                    const text = formatMessageContent(msg.content);
                    if (msg._getType() === "ai") {
                        if (text) {
                            finalOutput = text;
                            break;
                        }
                    }
                }
                if (finalOutput) {
                    console.log(finalOutput);
                }
                else {
                    // Fallback: If no text was found (e.g. ended on a tool call), describe the last state
                    const lastMsg = messages[messages.length - 1];
                    if (lastMsg?._getType() === "ai" && lastMsg.tool_calls?.length > 0) {
                        console.log(`Thinking: Executing ${lastMsg.tool_calls.map((tc) => tc.name).join(", ")}...`);
                    }
                    else {
                        console.log("Analysis complete. No specific text summary provided.");
                    }
                }
                return; // Success
            }
            catch (error) {
                const msg = error?.message || String(error);
                const isRetryable = msg.includes("rate-limit") || msg.includes("Rate") || msg.includes("429") || msg.includes("No endpoints found");
                const isLastAttempt = round === MAX_ROUNDS - 1 && i === models.length - 1;
                if (isRetryable && !isLastAttempt) {
                    const nextModel = i < models.length - 1 ? models[i + 1] : models[0];
                    const waitSec = i < models.length - 1 ? 2 : (round + 1) * 5;
                    console.error(`[retry] ${modelId} unavailable, waiting ${waitSec}s then trying ${nextModel}...`);
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                    continue;
                }
                // All rounds exhausted
                console.error("Agent Error:", msg);
                process.exit(1);
            }
        }
    }
}
async function main() {
    // Move execution context to the monorepo root so Git tools function correctly
    process.chdir(join(process.cwd(), ".."));
    const prompt = process.argv[2];
    const toolModel = process.argv[3];
    if (!prompt) {
        console.error("Please provide a prompt");
        process.exit(1);
    }
    await runWithRetry(prompt, toolModel);
}
main();
