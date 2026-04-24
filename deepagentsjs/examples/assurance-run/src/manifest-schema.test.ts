import { describe, expect, it } from "vitest";

import { parseAssuranceRunManifestV1 } from "./manifest-schema.js";

const minimalBase = {
  schema_version: "assurance_run_manifest_v1" as const,
  generated_at: new Date().toISOString(),
  git: { commit_sha: "abcdef1", dirty: false },
  tools: [{ name: "node", version: "v20.0.0" }],
};

describe("parseAssuranceRunManifestV1", () => {
  it("rejects chain_intelligence ok without evidence_bundle_sha256", () => {
    expect(() =>
      parseAssuranceRunManifestV1({
        ...minimalBase,
        chain_intelligence: { status: "ok" },
      }),
    ).toThrow();
  });

  it("accepts chain_intelligence skipped without hash", () => {
    const m = parseAssuranceRunManifestV1({
      ...minimalBase,
      chain_intelligence: { status: "skipped", notes: "no pipeline yet" },
    });
    expect(m.chain_intelligence?.status).toBe("skipped");
  });

  it("accepts chain_intelligence with trigger summary fields", () => {
    const m = parseAssuranceRunManifestV1({
      ...minimalBase,
      chain_intelligence: {
        status: "ok",
        ingestion_method: "webhook",
        evidence_bundle_sha256: "a".repeat(64),
        evidence_schema_version: "asst_chain_evidence_v2",
        transaction_count: 42,
        trigger_counts: {
          total: 3,
          by_kind: { program_upgrade: 1, large_native_transfer: 2 },
          by_severity: { high: 1, medium: 2 },
        },
        trigger_max_severity: "high",
        trigger_kinds: ["large_native_transfer", "program_upgrade"],
      },
    });
    expect(m.chain_intelligence?.trigger_counts?.total).toBe(3);
    expect(m.chain_intelligence?.trigger_max_severity).toBe("high");
    expect(m.chain_intelligence?.trigger_kinds).toEqual([
      "large_native_transfer",
      "program_upgrade",
    ]);
  });

  it("accepts chain_intelligence with null trigger_max_severity (no triggers)", () => {
    const m = parseAssuranceRunManifestV1({
      ...minimalBase,
      chain_intelligence: {
        status: "ok",
        evidence_bundle_sha256: "b".repeat(64),
        trigger_max_severity: null,
        trigger_counts: { total: 0 },
      },
    });
    expect(m.chain_intelligence?.trigger_max_severity).toBeNull();
  });

  it("rejects unknown trigger_kind values", () => {
    expect(() =>
      parseAssuranceRunManifestV1({
        ...minimalBase,
        chain_intelligence: {
          status: "ok",
          evidence_bundle_sha256: "c".repeat(64),
          trigger_kinds: ["unknown_kind_xyz"],
        },
      }),
    ).toThrow();
  });
});
