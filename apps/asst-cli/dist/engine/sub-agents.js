import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { loadSkills } from "./skill-loader.js";
import { solanaRpcReadTool, gitDiffSummaryTool, writeAssuranceManifestTool, programAccountAnalyzerTool, programUpgradeMonitorTool, cpiGraphMapperTool, accountStateSnapshotTool, secretScannerTool, envHygieneCheckTool, unifiedPostureReportTool, generatePdfReportTool, anchorSourceScannerTool, tokenConcentrationTool } from "./assurance-tools/index.js";
import { readFileTool } from "./tools.js";
// ─── Model Factory ───────────────────────────────────────────────
function createGoogleModel(modelId) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey)
        throw new Error("Missing GOOGLE_API_KEY");
    return new ChatGoogleGenerativeAI({ model: modelId, apiKey, temperature: 0.1 });
}
function createOpenRouterModel(modelId) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey)
        throw new Error("Missing OPENROUTER_API_KEY");
    return new ChatOpenRouter({ model: modelId, apiKey, temperature: 0.1 });
}
function createModel(modelId) {
    if (modelId.startsWith("gemini"))
        return createGoogleModel(modelId);
    return createOpenRouterModel(modelId);
}
export const SUB_AGENT_CONFIGS = [
    {
        name: "solana_vulnerability_analyst",
        description: "Analyzes Solana program code for vulnerabilities: Anchor constraints, PDA seeds, signer checks, CPI boundaries, oracle dependencies.",
        primaryModel: "gemini-2.0-flash",
        fallbackModels: ["gemini-2.5-flash"],
        skills: [
            "solana-defi-vulnerability-analyst-agent",
            "sealevel-attacks-solana",
            "neodyme-solana-security-workshop"
        ],
        tools: [programAccountAnalyzerTool, anchorSourceScannerTool, readFileTool, solanaRpcReadTool],
        systemPromptPrefix: "You are the Solana Vulnerability Analyst sub-agent. Your job is to analyze Solana programs for security vulnerabilities using your specialized tools and deep knowledge of Sealevel attack patterns."
    },
    {
        name: "defi_security_auditor",
        description: "Audits DeFi protocols for admin takeover vectors, upgrade authority risks, flash loan patterns, governance centralization.",
        primaryModel: "gemini-2.0-flash",
        fallbackModels: ["gemini-2.5-flash"],
        skills: [
            "defi-security-audit-agent",
            "defi-admin-takeover-mitigation-lessons",
            "flash-loan-exploit-investigator-agent"
        ],
        tools: [cpiGraphMapperTool, programUpgradeMonitorTool, accountStateSnapshotTool, readFileTool],
        systemPromptPrefix: "You are the DeFi Security Auditor sub-agent. Your job is to audit DeFi protocols for centralization risks, admin takeover vectors, and flash loan vulnerabilities."
    },
    {
        name: "rug_pull_detector",
        description: "Detects rug pull patterns: liquidity lock verification, LP distribution, transfer restrictions, dev wallet clustering.",
        primaryModel: "nvidia/nemotron-nano-9b-v2:free",
        fallbackModels: ["openai/gpt-oss-20b:free", "gemini-2.0-flash"],
        skills: [
            "rug-pull-pattern-detection-agent",
            "honeypot-detection-techniques"
        ],
        tools: [solanaRpcReadTool, accountStateSnapshotTool, tokenConcentrationTool],
        systemPromptPrefix: "You are the Rug Pull Detector sub-agent. Your job is to analyze tokens and protocols for rug pull patterns, honeypot mechanics, and liquidity risks."
    },
    {
        name: "secret_hygiene_scanner",
        description: "Scans repositories for hardcoded secrets, environment hygiene issues, and git history leaks.",
        primaryModel: "nvidia/nemotron-nano-9b-v2:free",
        fallbackModels: ["openai/gpt-oss-20b:free", "gemini-2.0-flash"],
        skills: [
            "on-chain-investigator-agent",
            "osec-solana-auditor-introduction"
        ],
        tools: [secretScannerTool, envHygieneCheckTool, gitDiffSummaryTool],
        systemPromptPrefix: "You are the Secret & Hygiene Scanner sub-agent. Your job is to find hardcoded secrets, environment misconfigurations, and git history leaks in repositories."
    },
    {
        name: "supply_chain_analyst",
        description: "Analyzes dependency supply chain: npm audit, static analysis, SARIF output, vulnerability manifests.",
        primaryModel: "openai/gpt-oss-20b:free",
        fallbackModels: ["nvidia/nemotron-nano-9b-v2:free", "gemini-2.0-flash"],
        skills: [
            "blockchain-intelligence-fundamentals",
            "blockchain-analytics-operations"
        ],
        tools: [writeAssuranceManifestTool],
        systemPromptPrefix: "You are the Supply Chain Analyst sub-agent. Your job is to analyze dependency vulnerabilities, run static analysis, and produce structured security manifests."
    },
    {
        name: "report_synthesizer",
        description: "Synthesizes findings from all sub-agents into a professional security report with severity ratings and remediation advice.",
        primaryModel: "gemini-2.5-flash",
        fallbackModels: ["gemini-2.0-flash"],
        skills: [
            "blockchain-intelligence-playbook",
            "cmichel-smart-contract-auditor-guide"
        ],
        tools: [unifiedPostureReportTool, generatePdfReportTool],
        systemPromptPrefix: "You are the Report Synthesizer sub-agent. Your primary job is to take raw findings from other security scanners and produce a professional security assessment report. IMPORTANT: ONLY generate a PDF report if you are explicitly given structured scan results or findings to process. For general conversation or queries without scan findings, do NOT use the generatePdfReportTool; simply answer the user dynamically in chat."
    }
];
// ─── Sub-Agent Runtime ───────────────────────────────────────────
export class SubAgent {
    config;
    agent;
    repoRoot;
    constructor(config, repoRoot) {
        this.config = config;
        this.repoRoot = repoRoot;
        this.initAgent(config.primaryModel);
    }
    initAgent(modelId) {
        const llm = createModel(modelId);
        const skillContent = loadSkills(this.repoRoot, this.config.skills);
        const systemPrompt = [
            this.config.systemPromptPrefix,
            "",
            "=== DOMAIN KNOWLEDGE ===",
            skillContent || "(No skills loaded)",
            "=== END DOMAIN KNOWLEDGE ===",
            "",
            "Use your tools to gather evidence. Always cite specific findings with file paths, line numbers, or account addresses. Classify severity as Critical / High / Medium / Low / Informational."
        ].join("\n");
        this.agent = createReactAgent({
            llm,
            tools: this.config.tools,
            messageModifier: systemPrompt
        });
    }
    async invoke(input) {
        const { HumanMessage } = await import("@langchain/core/messages");
        for (let attempt = 0; attempt <= this.config.fallbackModels.length; attempt++) {
            try {
                const result = await this.agent.invoke({
                    messages: [new HumanMessage(input)]
                });
                const lastMsg = result.messages[result.messages.length - 1];
                return this.formatContent(lastMsg.content);
            }
            catch (error) {
                const isRetryable = error?.message?.includes("429") ||
                    error?.message?.includes("rate") ||
                    error?.message?.includes("not found") ||
                    error?.message?.includes("404");
                if (isRetryable && attempt < this.config.fallbackModels.length) {
                    const fallback = this.config.fallbackModels[attempt];
                    console.log(`  [${this.config.name}] Model busy, switching to ${fallback}...`);
                    this.initAgent(fallback);
                    continue;
                }
                throw error;
            }
        }
        throw new Error(`All models exhausted for ${this.config.name}`);
    }
    formatContent(content) {
        if (typeof content === "string")
            return content;
        if (Array.isArray(content)) {
            return content
                .map((p) => (typeof p === "string" ? p : p.text || ""))
                .join("")
                .trim();
        }
        return String(content || "");
    }
}
/**
 * Create all sub-agents for a given repo.
 */
export function createAllSubAgents(repoRoot) {
    const agents = new Map();
    for (const config of SUB_AGENT_CONFIGS) {
        agents.set(config.name, new SubAgent(config, repoRoot));
    }
    return agents;
}
