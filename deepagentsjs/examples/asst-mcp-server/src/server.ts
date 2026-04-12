/**
 * ASST Assurance MCP server (stdio).
 * Exposes the same capabilities as LangChain tools in examples/assurance-tools — for MCP clients (Cursor, Claude Code, etc.).
 */
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { mergeSarifLogs, parseSarifJson } from "../../assurance-run/src/merge-sarif.js";
import { runSemgrepScan } from "../../assurance-run/src/run-semgrep.js";

const execFileAsync = promisify(execFile);

function textResult(body: string, isError = false) {
  return {
    content: [{ type: "text" as const, text: body }],
    ...(isError ? { isError: true as const } : {}),
  };
}

const server = new McpServer(
  { name: "asst-assurance", version: "0.1.0" },
  {
    instructions:
      "ASST assurance tools: Semgrep SARIF scan, merge SARIF files, git diff summary, Solana JSON-RPC (read-only), write assurance manifest via repo CLI. " +
      "Requires semgrep in PATH for scans; set SOLANA_RPC_URL for custom RPC. write_assurance_manifest runs pnpm from deepagentsjsRoot.",
  },
);

server.registerTool(
  "asst_semgrep_scan",
  {
    description:
      "Run Semgrep with SARIF output to `outDir/semgrep.sarif`. Returns skipped if semgrep is not in PATH.",
    inputSchema: {
      cwd: z.string().describe("Repository or scan root directory"),
      outDir: z.string().describe("Directory for output (semgrep.sarif); created if missing"),
      config: z.string().optional().describe("Semgrep --config value (default: auto)"),
      scanPaths: z.array(z.string()).optional().describe("Paths relative to cwd (default: [\".\"])"),
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
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(msg, true);
    }
  },
);

server.registerTool(
  "asst_merge_sarif",
  {
    description: "Merge multiple SARIF 2.1.0 JSON files into one deterministic log (same logic as assurance-run P2 lane).",
    inputSchema: {
      inputPaths: z
        .array(z.string().min(1))
        .min(1)
        .describe("Absolute or relative paths to SARIF JSON files"),
      outputPath: z.string().min(1).describe("File path for merged SARIF output"),
    },
  },
  async (args) => {
    try {
      const logs = args.inputPaths.map((p) => {
        const raw = JSON.parse(readFileSync(p, "utf8")) as unknown;
        return parseSarifJson(raw);
      });
      const merged = mergeSarifLogs(logs);
      writeFileSync(args.outputPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
      return textResult(`Wrote merged SARIF to ${args.outputPath}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(msg, true);
    }
  },
);

server.registerTool(
  "asst_git_diff_summary",
  {
    description:
      "Read-only: `git diff --stat HEAD` or `git status --porcelain` for repository evidence (lane §D).",
    inputSchema: {
      cwd: z.string().optional().describe("Repository root (default: process.cwd())"),
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
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(msg, true);
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
      params: z.array(z.unknown()).optional().describe("JSON-RPC params array"),
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
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(msg, true);
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
      outDir: z.string().optional().describe("Output directory under repo (default: assurance)"),
      noSupplyChain: z.boolean().optional(),
      noStaticAnalysis: z.boolean().optional(),
      semgrepScanRoot: z.string().optional().describe("e.g. deepagentsjs"),
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
      const msg = e instanceof Error ? e.message : String(e);
      return textResult(msg, true);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
