import { describe, expect, it } from "vitest";

import { mergeSarifLogs, parseSarifJson } from "./merge-sarif.js";

describe("mergeSarifLogs", () => {
  it("returns minimal log for empty input", () => {
    const m = mergeSarifLogs([]);
    expect(m.version).toBe("2.1.0");
    expect(m.runs?.[0]?.results?.length).toBe(0);
  });

  it("normalizes single log with defaults", () => {
    const m = mergeSarifLogs([{ runs: [] }]);
    expect(m.runs?.length).toBe(1);
    expect(m.runs?.[0]?.results?.length).toBe(0);
  });

  it("merges results and dedupes rules by id", () => {
    const a = parseSarifJson({
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "a",
              rules: [{ id: "r1", name: "one" }],
            },
          },
          results: [{ ruleId: "r1" }],
        },
      ],
    });
    const b = parseSarifJson({
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "b",
              rules: [{ id: "r1", name: "dup" }, { id: "r2" }],
            },
          },
          results: [{ ruleId: "r2" }],
        },
      ],
    });
    const m = mergeSarifLogs([a, b]);
    expect(m.runs?.[0]?.results?.length).toBe(2);
    const rules = m.runs?.[0]?.tool?.driver?.rules ?? [];
    expect(rules.map((r) => r.id).sort()).toEqual(["r1", "r2"]);
  });
});

describe("parseSarifJson", () => {
  it("throws on non-object", () => {
    expect(() => parseSarifJson(null)).toThrow();
  });
});
