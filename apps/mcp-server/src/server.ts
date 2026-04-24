/**
 * ASST Assurance MCP server (stdio).
 *
 * Exposes the same capabilities as the LangChain tools in `@ares/engine` —
 * for MCP clients such as Cursor and Claude Desktop.
 *
 * All tool implementations live in `packages/engine/src/assurance-tools` and
 * are imported via `@ares/engine` so there is a single source of truth.
 */
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  accountStateSnapshotTool,
  cpiGraphMapperTool,
  envHygieneCheckTool,
  mergeSarifLogs,
  parseSarifJson,
  programAccountAnalyzerTool,
  programUpgradeMonitorTool,
  runSemgrepScan,
  secretScannerTool,
  unifiedPostureReportTool,
} from "@ares/engine";

const execFileAsync = promisify(execFile);

function textResult(body: string, isError = false) {
  return {
    content: [{ type: "text" as const, text: body }],
    ...(isError ? { isError: true as const } : {}),
  };
}

const server = new McpServer(
  { name: "asst-assurance", version: "0.2.0" },
  {
    instructions:
      "ASST assurance tools: Semgrep SARIF scan, merge SARIF files, git diff summary, Solana JSON-RPC (read-only), write assurance manifest via repo CLI. " +
      "Expanded tools include program account analyzer, upgrade monitor, CPI graph mapper, and account snapshot. " +
      "Requires semgrep in PATH for scans; set SOLANA_RPC_URL for custom RPC. write_assurance_manifest runs pnpm from deepagentsjsRoot.",
  },
);

// Helper to wrap a LangChain tool for MCP.
function wrapTool<TSchema extends Record<string, any>>(
  mcpName: string,
  description: string,
  inputSchema: TSchema,
  lcTool: { invoke: (args: any) => Promise<string> },
) {
  server.registerTool(
    mcpName,
    { description, inputSchema },
    (async (args: any) => {
      try {
        const res = await lcTool.invoke(args);
        return textResult(res);
      } catch (e) {
        return textResult(e instanceof Error ? e.message : String(e), true);
      }
    }) as any,
  );
}

wrapTool(
  "asst_program_account_analyzer",
  "Analyzes a Solana program address, retrieving execution status, upgrade authority, and total accounts owned.",
  {
    programId: z.string().describe("Solana program address"),
    rpcUrl: z.string().optional().describe("Optional custom RPC URL"),
  },
  programAccountAnalyzerTool as any,
);

wrapTool(
  "asst_program_upgrade_monitor",
  "Checks if a Solana program is upgradable, getting its BPF loader info and Program Data Account.",
  {
    programId: z.string().describe("Solana program address to target"),
    slotInfo: z.string().optional().describe("Latest slot or commitment"),
  },
  programUpgradeMonitorTool as any,
);

wrapTool(
  "asst_cpi_graph_mapper",
  "Analyzes an Anchor IDL JSON file to extract program instructions, account structures, and identify potential risks like missing signers.",
  { idlPath: z.string().describe("Path to Anchor IDL JSON file") },
  cpiGraphMapperTool as any,
);

wrapTool(
  "asst_account_state_snapshot",
  "Takes a snapshot of raw account state data from Solana and saves it to the evidence directory.",
  {
    programId: z.string().describe("Solana program address or account"),
    rpcUrl: z.string().optional().describe("Optional custom RPC URL"),
    outDir: z
      .string()
      .optional()
      .describe("Output directory. Defaults to 'assurance/snapshots'"),
  },
  accountStateSnapshotTool as any,
);

wrapTool(
  "asst_secret_scanner",
  "Scans the git repository history for committed hardcoded secrets like API keys and private keys.",
  { cwd: z.string().describe("Repository root to scan") },
  secretScannerTool as any,
);

wrapTool(
  "asst_env_hygiene_check",
  "Validates repository environment configuration hygiene (e.g., .env ignores, example files).",
  { cwd: z.string().describe("Repository root to check") },
  envHygieneCheckTool as any,
);

wrapTool(
  "asst_unified_posture_report",
  "Helps generate the top-level layered score for the dashboard.",
  { assuranceDir: z.string().describe("Path to assurance output directory") },
  unifiedPostureReportTool as any,
);

server.registerTool(
  "asst_semgrep_scan",
  {
    description:
      "Run Semgrep with SARIF output to `outDir/semgrep.sarif`. Returns skipped if semgrep is not in PATH.",
    inputSchema: {
      cwd: z.string().describe("Repository or scan root directory"),
      outDir: z
        .string()
        .describe("Directory for output (semgrep.sarif); created if missing"),
      config: z
        .string()
        .optional()
        .describe("Semgrep --config value (default: auto)"),
      scanPaths: z
        .array(z.string())
        .optional()
        .describe('Paths relative to cwd (default: ["."])'),
    },
  },
  async (args) => {
    try {
      mkdirSync(args.outDir, { recursive: true });
      const result = runSemgrepScan({
        cwd: args.cwd,
        outDir: args.outDir,
        config: args.config,
        scanPaths: args.scanPaths,
      });
      return textResult(JSON.stringify(result, null, 2));
    } catch (e) {
      return textResult(e instanceof Error ? e.message : String(e), true);
    }
  },
);

server.registerTool(
  "asst_merge_sarif",
  {
    description:
      "Merge multiple SARIF 2.1.0 JSON files into one deterministic log (same logic as assurance-run P2 lane).",
    inputSchema: {
      inputPaths: z
        .array(z.string().min(1))
        .min(1)
        .describe("Absolute or relative paths to SARIF JSON files"),
      outputPath: z
        .string()
        .min(1)
        .describe("File path for merged SARIF output"),
    },
  },
  async (args) => {
    try {
      const logs = args.inputPaths.map((p) => {
        const raw = JSON.parse(readFileSync(p, "utf8")) as unknown;
        return parseSarifJson(raw);
      });
      const merged = mergeSarifLogs(logs);
      writeFileSync(
        args.outputPath,
        `${JSON.stringify(merged, null, 2)}\n`,
        "utf8",
      );
      return textResult(`Wrote merged SARIF to ${args.outputPath}`);
    } catch (e) {
      return textResult(e instanceof Error ? e.message : String(e), true);
    }
  },
);

server.registerTool(
  "asst_git_diff_summary",
  {
    description:
      "Read-only: `git diff --stat HEAD` or `git status --porcelain` for repository evidence.",
    inputSchema: {
      cwd: z
        .string()
        .optional()
        .describe("Repository root (default: process.cwd())"),
      stat: z
        .boolean()
        .optional()
        .describe("If true, run git status --porcelain instead of diff --stat"),
    },
  },
  async (args) => {
    try {
      const cwd = args.cwd ?? process.cwd();
      if (args.stat) {
        const { stdout } = await execFileAsync(
          "git",
          ["status", "--porcelain"],
          { cwd, maxBuffer: 10 * 1024 * 1024 },
        );
        return textResult(stdout || "(clean)");
      }
      const { stdout } = await execFileAsync(
        "git",
        ["diff", "--stat", "HEAD"],
        { cwd, maxBuffer: 10 * 1024 * 1024 },
      );
      return textResult(stdout || "(no diff)");
    } catch (e) {
      return textResult(e instanceof Error ? e.message : String(e), true);
    }
  },
);

server.registerTool(
  "asst_solana_rpc_read",
  {
    description:
      "POST a JSON-RPC request to Solana RPC (read-only). Uses SOLANA_RPC_URL or devnet default.",
    inputSchema: {
      method: z.string().min(1).describe("JSON-RPC method name"),
      params: z
        .array(z.unknown())
        .optional()
        .describe("JSON-RPC params array"),
    },
  },
  async (args) => {
    try {
      const rpcUrl =
        process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
      const body = {
        jsonrpc: "2.0",
        id: 1,
        method: args.method,
        params: args.params ?? [],
      };
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      return textResult(`status=${res.status}\n${text}`);
    } catch (e) {
      return textResult(e instanceof Error ? e.message : String(e), true);
    }
  },
);

server.registerTool(
  "asst_write_assurance_manifest",
  {
    description:
      "Run `write-run-manifest.ts` via pnpm from deepagentsjs (real manifest + optional Semgrep/supply-chain lanes).",
    inputSchema: {
      repoRoot: z.string().describe("Git repository root (--cwd)"),
      deepagentsjsRoot: z
        .string()
        .optional()
        .describe("Path to deepagentsjs/ (default: repoRoot/deepagentsjs)"),
      outDir: z
        .string()
        .optional()
        .describe("Output directory under repo (default: assurance)"),
      noSupplyChain: z.boolean().optional(),
      noStaticAnalysis: z.boolean().optional(),
      semgrepScanRoot: z
        .string()
        .optional()
        .describe("e.g. deepagentsjs"),
      notes: z.string().optional(),
    },
  },
  async (input) => {
    try {
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

      const { stdout, stderr } = await execFileAsync("pnpm", args, {
        cwd: resolve(deepagentsRoot),
        maxBuffer: 20 * 1024 * 1024,
        env: process.env,
      });
      return textResult(`${stdout}\n${stderr}`.trim() || "(done)");
    } catch (e) {
      return textResult(e instanceof Error ? e.message : String(e), true);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
