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
});
