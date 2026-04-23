import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { solanaRpcReadTool, gitDiffSummaryTool, writeAssuranceManifestTool, programAccountAnalyzerTool, programUpgradeMonitorTool, cpiGraphMapperTool, accountStateSnapshotTool, secretScannerTool, envHygieneCheckTool, unifiedPostureReportTool, generatePdfReportTool } from "./assurance-tools/index.js";
import { readFileTool, writeFileTool, runTerminalCmdTool } from "./tools.js";
import { ASSTPersistence } from "./persistence.js";
const FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "mistralai/mistral-7b-instruct:free"
];
export class ASSTAgentEngine {
    agent;
    persistence;
    currentModel;
    repoRoot;
    constructor(repoRoot, modelId = "gemini-2.5-flash") {
        this.repoRoot = repoRoot;
        this.currentModel = modelId;
        this.persistence = new ASSTPersistence(repoRoot);
        this.initAgent(modelId);
    }
    initAgent(modelId) {
        this.currentModel = modelId;
        let llm;
        if (modelId.startsWith("gemini")) {
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) {
                throw new Error("Missing GOOGLE_API_KEY. Gemini models require a direct Google AI Studio key.");
            }
            llm = new ChatGoogleGenerativeAI({
                model: modelId,
                apiKey,
                temperature: 0.1,
            });
        }
        else {
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                throw new Error("Missing OPENROUTER_API_KEY. OpenRouter models require an API key.");
            }
            llm = new ChatOpenRouter({
                model: modelId,
                apiKey,
                temperature: 0.1,
            });
        }
        const tools = [
            solanaRpcReadTool,
            gitDiffSummaryTool,
            writeAssuranceManifestTool,
            programAccountAnalyzerTool,
            programUpgradeMonitorTool,
            cpiGraphMapperTool,
            accountStateSnapshotTool,
            secretScannerTool,
            envHygieneCheckTool,
            unifiedPostureReportTool,
            generatePdfReportTool,
            readFileTool,
            writeFileTool,
            runTerminalCmdTool
        ];
        this.agent = createReactAgent({
            llm,
            tools,
            messageModifier: `You are ASST Terminal, a persistent security agent. You are currently using model: ${modelId} (${modelId.startsWith("gemini") ? "Direct Google SDK" : "OpenRouter"}). Maintain session history and help develop/audit Solana code.`
        });
    }
    async init() {
        await this.persistence.init();
    }
    async chat(input, fallbackIdx = -1) {
        try {
            const rawHistory = await this.persistence.getHistory(10);
            const messages = rawHistory.reverse().map(m => m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content));
            messages.push(new HumanMessage(input));
            if (fallbackIdx === -1) {
                await this.persistence.addHistory("user", input);
            }
            const result = await this.agent.invoke({ messages });
            const lastMsg = result.messages[result.messages.length - 1];
            const responseText = this.formatMessageContent(lastMsg.content);
            await this.persistence.addHistory("agent", responseText);
            return responseText;
        }
        catch (error) {
            const nextIdx = fallbackIdx + 1;
            if (error?.message?.includes("rate-limited") || error?.message?.includes("429") || error?.status === 429) {
                if (nextIdx < FALLBACK_MODELS.length) {
                    const fallbackModel = FALLBACK_MODELS[nextIdx];
                    console.log(`\n[FALLBACK] ${this.currentModel} is busy. Switching to ${fallbackModel}...`);
                    this.initAgent(fallbackModel);
                    return this.chat(input, nextIdx);
                }
            }
            throw error;
        }
    }
    formatMessageContent(content) {
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
                return "";
            })
                .join("")
                .trim();
        }
        return String(content || "");
    }
    async close() {
        await this.persistence.close();
    }
}
