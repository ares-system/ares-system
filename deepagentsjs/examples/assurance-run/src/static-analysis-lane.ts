import { writeFileSync } from "node:fs";
import { join } from "node:path";

import type { AssuranceRunManifestV1 } from "./manifest-schema.js";
import { mergeSarifLogs, parseSarifJson, type SarifLog } from "./merge-sarif.js";
import { readSarifFile, runSemgrepScan } from "./run-semgrep.js";

export type StaticAnalysisLaneResult = {
  mergedSarifPath: string;
  staticAnalysis: AssuranceRunManifestV1["static_analysis"];
  extraTools: Array<{ name: string; version: string; exit_code?: number }>;
};

/**
 * P2 lane: Semgrep → SARIF → optional merge (single file). Writes `findings-merged.sarif.json` under `outDir`.
 */
export function runStaticAnalysisLane(options: {
  repoRoot: string;
  outDir: string;
  /** Directory to scan with Semgrep (default: `repoRoot`). Use `deepagentsjs` subfolder for faster CI. */
  semgrepCwd?: string;
  /** Paths relative to `semgrepCwd` / scan root (default: `[".\"]`). */
  semgrepScanPaths?: string[];
  /** Extra SARIF paths to merge after Semgrep (e.g. future ESLint SARIF) */
  extraSarifPaths?: string[];
}): StaticAnalysisLaneResult {
  const {
    repoRoot,
    outDir,
    semgrepCwd,
    semgrepScanPaths,
    extraSarifPaths = [],
  } = options;
  const semgrep = runSemgrepScan({
    cwd: semgrepCwd ?? repoRoot,
    outDir,
    scanPaths: semgrepScanPaths,
  });
  const extraTools: Array<{
    name: string;
    version: string;
    exit_code?: number;
  }> = [];

  let staticAnalysis: AssuranceRunManifestV1["static_analysis"];

  const logs: SarifLog[] = [];
  if (semgrep.status === "skipped") {
    staticAnalysis = {
      semgrep: { status: "skipped", reason: semgrep.reason },
    };
  } else {
    extraTools.push({
      name: "semgrep",
      version: semgrep.version,
      exit_code: semgrep.exitCode,
    });
    staticAnalysis = {
      semgrep: { status: "ok", exit_code: semgrep.exitCode },
    };
    logs.push(parseSarifJson(readSarifFile(semgrep.sarifPath)));
  }

  for (const p of extraSarifPaths) {
    logs.push(parseSarifJson(readSarifFile(p)));
  }

  const merged = mergeSarifLogs(logs);
  const mergedSarifPath = join(outDir, "findings-merged.sarif.json");
  writeFileSync(
    mergedSarifPath,
    `${JSON.stringify(merged, null, 2)}\n`,
    "utf8",
  );

  return { mergedSarifPath, staticAnalysis, extraTools };
}
