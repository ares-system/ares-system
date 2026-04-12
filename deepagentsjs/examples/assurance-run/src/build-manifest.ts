import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import {
  ASSURANCE_RUN_MANIFEST_V1,
  type AssuranceRunManifestV1,
} from "./manifest-schema.js";

function tryGit(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function sha256File(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

function detectLockfileHashes(cwd: string): Record<string, string> | undefined {
  const names = ["pnpm-lock.yaml", "package-lock.json", "Cargo.lock"] as const;
  const roots = [cwd, join(cwd, "deepagentsjs")];
  const out: Record<string, string> = {};
  for (const root of roots) {
    for (const n of names) {
      const p = join(root, n);
      const h = sha256File(p);
      const key = root === cwd ? n : `deepagentsjs/${n}`;
      if (h && out[key] === undefined) out[key] = h;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function defaultTools(): Array<{ name: string; version: string }> {
  const tools: Array<{ name: string; version: string }> = [
    { name: "node", version: process.version },
  ];
  try {
    const pnpmV = execFileSync("pnpm", ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    tools.push({ name: "pnpm", version: pnpmV });
  } catch {
    /* optional */
  }
  return tools;
}

export type BuildManifestOptions = {
  cwd: string;
  extraTools?: Array<{ name: string; version: string; exit_code?: number }>;
  mergedJsonPath?: string;
  /** P2 — path to merged SARIF file; hashed as `artifact_hashes.merged_sarif_sha256` */
  mergedSarifPath?: string;
  /** P3 supply-chain summary (advisory counts + merged JSON hash) */
  supplyChain?: AssuranceRunManifestV1["supply_chain"];
  /** P2 — Semgrep / static analysis lane summary */
  staticAnalysis?: AssuranceRunManifestV1["static_analysis"];
  /** Optional — Solana pipeline evidence (hash of merged parsed JSON) */
  chainIntelligence?: AssuranceRunManifestV1["chain_intelligence"];
  notes?: string;
};

/**
 * Build a v1 manifest for the current working tree (git + optional lockfile hashes).
 */
export function buildAssuranceRunManifestV1(
  options: BuildManifestOptions,
): AssuranceRunManifestV1 {
  const {
    cwd,
    extraTools = [],
    mergedJsonPath,
    mergedSarifPath,
    supplyChain,
    staticAnalysis,
    chainIntelligence,
    notes,
  } = options;
  const commit_sha = tryGit(cwd, ["rev-parse", "HEAD"]) || "unknown";
  const ref = tryGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]) || undefined;
  const porcelain = tryGit(cwd, ["status", "--porcelain"]);
  const dirty = porcelain.length > 0;

  const lockfiles = detectLockfileHashes(cwd);
  let merged_json_sha256: string | undefined;
  if (mergedJsonPath) {
    merged_json_sha256 = sha256File(mergedJsonPath);
  }
  let merged_sarif_sha256: string | undefined;
  if (mergedSarifPath) {
    merged_sarif_sha256 = sha256File(mergedSarifPath);
  }

  const artifact_hashes =
    merged_json_sha256 || merged_sarif_sha256 || lockfiles
      ? {
          ...(merged_json_sha256 ? { merged_json_sha256 } : {}),
          ...(merged_sarif_sha256 ? { merged_sarif_sha256 } : {}),
          ...(lockfiles ? { lockfiles } : {}),
        }
      : undefined;

  const tools = [...defaultTools(), ...extraTools];

  return {
    schema_version: ASSURANCE_RUN_MANIFEST_V1,
    generated_at: new Date().toISOString(),
    git: {
      commit_sha,
      ref: ref === "HEAD" ? undefined : ref,
      dirty,
    },
    tools,
    ...(artifact_hashes ? { artifact_hashes } : {}),
    ...(supplyChain && Object.keys(supplyChain).length > 0
      ? { supply_chain: supplyChain }
      : {}),
    ...(staticAnalysis && Object.keys(staticAnalysis).length > 0
      ? { static_analysis: staticAnalysis }
      : {}),
    ...(chainIntelligence && Object.keys(chainIntelligence).length > 0
      ? { chain_intelligence: chainIntelligence }
      : {}),
    ...(notes ? { notes } : {}),
  };
}
