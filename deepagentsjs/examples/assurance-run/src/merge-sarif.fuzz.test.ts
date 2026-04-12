import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { mergeSarifLogs, parseSarifJson } from "./merge-sarif.js";

describe("mergeSarifLogs property", () => {
  it("never throws on array of arbitrary JSON objects coerced to SarifLog", () => {
    fc.assert(
      fc.property(fc.array(fc.jsonValue(), { maxLength: 5 }), (arr) => {
        const logs = arr.map((x) =>
          typeof x === "object" && x !== null ? x : { runs: [] },
        ) as Parameters<typeof mergeSarifLogs>[0];
        const out = mergeSarifLogs(logs);
        expect(out.runs?.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 50 },
    );
  });
});

describe("parseSarifJson", () => {
  it("accepts plain objects", () => {
    expect(parseSarifJson({ version: "2.1.0" }).version).toBe("2.1.0");
  });
});
