import { createReactAgent } from "@langchain/langgraph/prebuilt";

import {
  createAssuranceRunChatModel,
  loadDeepagentsEnv,
} from "./assurance-llm.js";
import { gitDiffSummaryTool } from "./git-diff-summary.js";
import { mergeFindingsTool } from "./merge-findings-tool.js";
import { solanaRpcReadTool } from "./solana-rpc-read.js";
import { writeAssuranceManifestTool } from "./write-assurance-manifest-tool.js";

import { programAccountAnalyzerTool } from "./program-account-analyzer.js";
import { programUpgradeMonitorTool } from "./program-upgrade-monitor.js";
import { cpiGraphMapperTool } from "./cpi-graph-mapper.js";
import { accountStateSnapshotTool } from "./account-state-snapshot.js";
import { secretScannerTool } from "./secret-scanner.js";
import { envHygieneCheckTool } from "./env-hygiene-check.js";
import { unifiedPostureReportTool } from "./unified-posture-report.js";
import { gitCloneRepoTool } from "./git-clone-repo.js";
import { generatePdfReportTool } from "./generate-pdf-report-tool.js";

/**
 * Preset deep agent for Solana assurance runs (TOOLS §A–E lanes).
 * Uses LangChain `ChatOpenRouter` from `createAssuranceRunChatModel()` — **OpenRouter is required**
 * (`OPENROUTER_API_KEY` in `deepagentsjs/.env`; see `assurance-llm.ts`).
 */
export function createAssuranceRunSolanaAgent(toolModelId?: string, orchestratorModelId?: string) {
  loadDeepagentsEnv();
  const model = createAssuranceRunChatModel({}, orchestratorModelId || "meta-llama/llama-3.3-70b-instruct:free");

  return createReactAgent({
    llm: model,
    messageModifier:
      "You are ASST, a SecOps Agentic specialist. You HAVE the capability to perform end-to-end security assurance on Solana repositories. " +
      "MISSION: When a URL is provided, you MUST use `git_clone_repo` first. Then, systematically use your security tools (scanners, diffs, analyzer) to generate a comprehensive report. " +
      "AUTONOMY: You are fully authorized to execute these scans. Proceed directly to tool execution. " +
      "EXTERNAL REPOS: If a Git URL is provided, clone it first, then use the resulting path for all scanning tools to focus analysis. " +
      "FINAL REPORT: Once any action (Full Assurance, Scan Diff, or Account Analysis) is COMPLETED 100%, you MUST invoke `generate_pdf_report`. " +
      "In your final summary, you MUST include the token `[REPORT:RepoName]` (e.g., `[REPORT:ASST]`) at the end of your message to provide the user with a download link. " +
      "NEVER show the button until the report has been successfully generated.",
    tools: [
      solanaRpcReadTool,
      gitCloneRepoTool,
      gitDiffSummaryTool,
      writeAssuranceManifestTool,
      mergeFindingsTool,
      programAccountAnalyzerTool,
      programUpgradeMonitorTool,
      cpiGraphMapperTool,
      accountStateSnapshotTool,
      secretScannerTool,
      envHygieneCheckTool,
      unifiedPostureReportTool,
      generatePdfReportTool,
    ],
  });
}

export { gitDiffSummaryTool, solanaRpcReadTool, writeAssuranceManifestTool };
