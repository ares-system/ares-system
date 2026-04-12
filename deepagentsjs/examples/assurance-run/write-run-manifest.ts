#!/usr/bin/env node
/**
 * CLI: write `assurance/run-<timestamp>.json` for the current repo state.
 *
 * Usage (from deepagentsjs/):
 *   pnpm exec tsx examples/assurance-run/write-run-manifest.ts
 *   pnpm exec tsx examples/assurance-run/write-run-manifest.ts --cwd /path/to/repo
 *   pnpm exec tsx examples/assurance-run/write-run-manifest.ts --merged path/to/merged.json
 *   pnpm exec tsx examples/assurance-run/write-run-manifest.ts --chain-evidence path/to/merged-chain-evidence.json
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  assuranceRunManifestV1Schema,
  type AssuranceRunManifestV1,
} from "./src/manifest-schema.js";
import { buildAssuranceRunManifestV1 } from "./src/build-manifest.js";
import {
  collectSupplyChainMerged,
  toManifestSupplyChain,
  type ManifestSupplyChainSlice,
} from "./src/supply-chain-merged.js";
import { runStaticAnalysisLane } from "./src/static-analysis-lane.js";

function parseArgs(argv: string[]): {
  cwd: string;
  outDir: string;
  merged?: string;
  notes?: string;
  supplyChain: boolean;
  includeRust: boolean;
  staticAnalysis: boolean;
  /** Relative to `cwd`: Semgrep scan root (e.g. `deepagentsjs`). */
  semgrepScanRoot?: string;
  /** Merged parsed pipeline evidence JSON; hashed into `chain_intelligence` */
  chainEvidence?: string;
} {
  let cwd = process.cwd();
  let outDir = "assurance";
  let merged: string | undefined;
  let notes: string | undefined;
  let supplyChain = true;
  let includeRust = true;
  let staticAnalysis = true;
  let semgrepScanRoot: string | undefined;
  let chainEvidence: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwd" && argv[i + 1]) {
      cwd = resolve(argv[++i]);
    } else if (a === "--out" && argv[i + 1]) {
      outDir = argv[++i];
    } else if (a === "--merged" && argv[i + 1]) {
      merged = resolve(argv[++i]);
    } else if (a === "--notes" && argv[i + 1]) {
      notes = argv[++i];
    } else if (a === "--no-supply-chain") {
      supplyChain = false;
    } else if (a === "--no-rust") {
      includeRust = false;
    } else if (a === "--no-static-analysis" || a === "--no-semgrep") {
      staticAnalysis = false;
    } else if (a === "--semgrep-scan-root" && argv[i + 1]) {
      semgrepScanRoot = argv[++i];
    } else if (a === "--chain-evidence" && argv[i + 1]) {
      chainEvidence = resolve(argv[++i]);
    }
  }
  return {
    cwd,
    outDir,
    merged,
    notes,
    supplyChain,
    includeRust,
    staticAnalysis,
    semgrepScanRoot,
    chainEvidence,
  };
}

const {
  cwd,
  outDir,
  merged,
  notes,
  supplyChain,
  includeRust,
  staticAnalysis,
  semgrepScanRoot,
  chainEvidence,
} = parseArgs(process.argv);

const dir = resolve(cwd, outDir);
mkdirSync(dir, { recursive: true });

let extraTools: Array<{ name: string; version: string; exit_code?: number }> =
  [];
let supplyChainSlice: ManifestSupplyChainSlice | undefined;
let mergedSarifPath: string | undefined;
let staticAnalysisSlice: AssuranceRunManifestV1["static_analysis"];

let chainIntelligenceSlice: AssuranceRunManifestV1["chain_intelligence"];
if (chainEvidence) {
  if (!existsSync(chainEvidence)) {
    console.error(`chain-evidence file not found: ${chainEvidence}`);
    process.exit(1);
  }
  const body = readFileSync(chainEvidence, "utf8");
  const evidence_bundle_sha256 = createHash("sha256")
    .update(body)
    .digest("hex");
  chainIntelligenceSlice = {
    status: "ok",
    ingestion_method: "webhook",
    evidence_bundle_sha256,
  };
}

if (supplyChain) {
  const { merged: scMerged, extraTools: et } = collectSupplyChainMerged({
    repoRoot: cwd,
    includeRust,
  });
  const mergedPath = join(dir, "supply-chain-merged.json");
  const body = `${JSON.stringify(scMerged, null, 2)}\n`;
  writeFileSync(mergedPath, body, "utf8");
  const sha = createHash("sha256").update(body).digest("hex");
  supplyChainSlice = toManifestSupplyChain(scMerged, sha);
  extraTools = et;
}

if (staticAnalysis) {
  const sa = runStaticAnalysisLane({
    repoRoot: cwd,
    outDir: dir,
    semgrepCwd: semgrepScanRoot ? resolve(cwd, semgrepScanRoot) : undefined,
  });
  mergedSarifPath = sa.mergedSarifPath;
  staticAnalysisSlice = sa.staticAnalysis;
  extraTools = [...extraTools, ...sa.extraTools];
}

const manifest = buildAssuranceRunManifestV1({
  cwd,
  mergedJsonPath: merged,
  mergedSarifPath,
  supplyChain: supplyChainSlice,
  staticAnalysis: staticAnalysisSlice,
  chainIntelligence: chainIntelligenceSlice,
  extraTools,
  notes,
});

const parsed = assuranceRunManifestV1Schema.parse(manifest);

const stamp = new Date()
  .toISOString()
  .replaceAll(":", "")
  .replace(/\.\d{3}Z$/, "Z");
const fileName = `run-${stamp}.json`;
const outPath = join(dir, fileName);
writeFileSync(outPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

console.log(`Wrote ${outPath}`);
if (supplyChain) {
  console.log(`Wrote ${join(dir, "supply-chain-merged.json")}`);
}
