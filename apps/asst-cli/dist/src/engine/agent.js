import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { solanaRpcReadTool, gitDiffSummaryTool, writeAssuranceManifestTool, programAccountAnalyzerTool, programUpgradeMonitorTool, cpiGraphMapperTool, accountStateSnapshotTool, secretScannerTool, envHygieneCheckTool, unifiedPostureReportTool, generatePdfReportTool } from "../../../../deepagentsjs/examples/assurance-tools/index.js";
import { readFileTool, writeFileTool, runTerminalCmdTool } from "./tools.js";
import { ASSTPersistence } from "./persistence.js";
export class ASSTAgentEngine {
    agent;
    persistence;
    constructor(repoRoot, modelId = "meta-llama/llama-3.3-70b-instruct:free") {
        this.persistence = new ASSTPersistence(repoRoot);
        const llm = new ChatOpenRouter({
            model: modelId,
        });
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
            messageModifier: "You are ASST Terminal, a persistent security agent. Maintain session history and help develop/audit Solana code."
        });
    }
    async init() {
        await this.persistence.init();
    }
    async chat(input) {
        // Load history
        const rawHistory = await this.persistence.getHistory(10);
        const messages = rawHistory.reverse().map(m => m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content));
        messages.push(new HumanMessage(input));
        // Save user input
        await this.persistence.addHistory("user", input);
        // Invoke agent
        const result = await this.agent.invoke({ messages });
        // Find last AI response
        const lastMsg = result.messages[result.messages.length - 1];
        const responseText = typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content);
        // Save agent response
        await this.persistence.addHistory("agent", responseText);
        return responseText;
    }
    async close() {
        await this.persistence.close();
    }
}
