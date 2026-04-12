import { createDeepAgent } from "deepagents";

import {
  createAssuranceRunChatModel,
  loadDeepagentsEnv,
} from "./assurance-llm.js";
import { gitDiffSummaryTool } from "./git-diff-summary.js";
import { mergeFindingsTool } from "./merge-findings-tool.js";
import { solanaRpcReadTool } from "./solana-rpc-read.js";
import { writeAssuranceManifestTool } from "./write-assurance-manifest-tool.js";

/**
 * Preset deep agent for Solana assurance runs (TOOLS §A–E lanes).
 * Uses LangChain `ChatOpenRouter` from `createAssuranceRunChatModel()` — **OpenRouter is required**
 * (`OPENROUTER_API_KEY` in `deepagentsjs/.env`; see `assurance-llm.ts`).
 */
export function createAssuranceRunSolanaAgent() {
  loadDeepagentsEnv();
  const model = createAssuranceRunChatModel();
  return createDeepAgent({
    model,
    systemPrompt:
      "You orchestrate Solana security assurance: static analysis (Semgrep/SARIF), " +
      "supply chain, commit-bound manifests under assurance/. " +
      "Delegate long tasks via the task tool. Prefer write_assurance_manifest for evidence bundles.",
    tools: [
      solanaRpcReadTool,
      gitDiffSummaryTool,
      writeAssuranceManifestTool,
      mergeFindingsTool,
    ],
    subagents: [
      {
        name: "static-policy",
        description:
          "Static analysis and policy: Semgrep, SARIF merge, dependency posture.",
        systemPrompt:
          "Focus on SAST output and manifest hashes. Do not invent findings.",
      },
      {
        name: "build-verify",
        description: "Build and verify lane when cargo/Anchor is in scope.",
        systemPrompt:
          "When invoked, reason about Rust/Anchor build evidence; do not run unscoped shell.",
      },
    ],
  });
}

export { gitDiffSummaryTool, solanaRpcReadTool, writeAssuranceManifestTool };
