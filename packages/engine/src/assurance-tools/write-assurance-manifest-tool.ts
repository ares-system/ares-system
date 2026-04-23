import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const schema = z.object({
  repoRoot: z
    .string()
    .describe("Git repository root (passed to manifest as --cwd)"),
  deepagentsjsRoot: z
    .string()
    .optional()
    .describe("Path to deepagentsjs/ (default: repoRoot/deepagentsjs)"),
  outDir: z.string().optional().describe("Output dir under repo (default: assurance)"),
  noSupplyChain: z.boolean().optional(),
  noStaticAnalysis: z.boolean().optional(),
  semgrepScanRoot: z.string().optional().describe("e.g. deepagentsjs"),
  notes: z.string().optional(),
});

/**
 * Spawns the assurance manifest CLI (real implementation, not a mock).
 */
export const writeAssuranceManifestTool = tool(
  async (input) => {
    const deepagentsRoot =
      input.deepagentsjsRoot ?? join(input.repoRoot, "deepagentsjs");
    const outDir = input.outDir ?? "assurance";
    const args = [
      "exec",
      "tsx",
      "examples/assurance-run/write-run-manifest.ts",
      "--cwd",
      input.repoRoot,
      "--out",
      outDir,
    ];
    if (input.noSupplyChain) args.push("--no-supply-chain");
    if (input.noStaticAnalysis) args.push("--no-static-analysis");
    if (input.semgrepScanRoot)
      args.push("--semgrep-scan-root", input.semgrepScanRoot);
    if (input.notes) args.push("--notes", input.notes);

    const command = `pnpm ${args.join(" ")}`;
    
    // Use exec (resilient shell-based execution) instead of execFile for Windows binary resolution
    const { stdout, stderr } = await promisify(require("node:child_process").exec)(command, {
      cwd: deepagentsRoot,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env }, // Pass the COMPLETE environment including PATH, SystemRoot, etc.
    });
    return `${stdout}\n${stderr}`;
  },
  {
    name: "write_assurance_manifest",
    description:
      "Run write-run-manifest.ts from deepagentsjs to emit assurance/run-*.json and supply-chain / SARIF artifacts.",
    schema,
  },
);
