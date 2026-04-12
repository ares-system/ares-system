import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildAssuranceRunManifestV1 } from "./build-manifest.js";

describe("buildAssuranceRunManifestV1", () => {
  it("includes merged sarif hash when file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "asst-am-"));
    const sarif = join(dir, "x.sarif.json");
    writeFileSync(sarif, '{"version":"2.1.0","runs":[]}\n', "utf8");
    const m = buildAssuranceRunManifestV1({
      cwd: dir,
      mergedSarifPath: sarif,
    });
    expect(m.artifact_hashes?.merged_sarif_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("includes static_analysis when provided", () => {
    const dir = mkdtempSync(join(tmpdir(), "asst-am2-"));
    const m = buildAssuranceRunManifestV1({
      cwd: dir,
      staticAnalysis: {
        semgrep: { status: "skipped", reason: "test" },
      },
    });
    expect(m.static_analysis?.semgrep).toEqual({
      status: "skipped",
      reason: "test",
    });
  });

  it("includes chain_intelligence when provided", () => {
    const dir = mkdtempSync(join(tmpdir(), "asst-am3-"));
    const m = buildAssuranceRunManifestV1({
      cwd: dir,
      chainIntelligence: {
        status: "ok",
        ingestion_method: "webhook",
        evidence_bundle_sha256: "a".repeat(64),
      },
    });
    expect(m.chain_intelligence?.status).toBe("ok");
    expect(m.chain_intelligence?.evidence_bundle_sha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });
});
