import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runStaticAnalysisLane } from "./static-analysis-lane.js";

describe("runStaticAnalysisLane", () => {
  it(
    "writes merged SARIF (Semgrep ok or skipped)",
    () => {
    const dir = mkdtempSync(join(tmpdir(), "asst-sa-"));
    const outDir = join(dir, "assurance");
    mkdirSync(outDir, { recursive: true });
    try {
      const r = runStaticAnalysisLane({ repoRoot: dir, outDir });
      const st = r.staticAnalysis?.semgrep?.status;
      expect(st === "ok" || st === "skipped").toBe(true);
      const text = readFileSync(r.mergedSarifPath, "utf8");
      const j = JSON.parse(text) as { version?: string };
      expect(j.version).toBe("2.1.0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    },
    180_000,
  );
});
