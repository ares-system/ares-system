import { readFileSync, writeFileSync } from "node:fs";

import { tool } from "langchain";
import { z } from "zod";

import { mergeSarifLogs, parseSarifJson } from "../assurance-run/src/merge-sarif.js";

const schema = z.object({
  inputPaths: z
    .array(z.string().min(1))
    .min(1)
    .describe("Paths to SARIF JSON files to merge"),
  outputPath: z.string().min(1).describe("Output path for merged SARIF"),
});

/**
 * Merge SARIF 2.1.0 files using the same logic as the P2 assurance lane.
 */
export const mergeFindingsTool = tool(
  async (input) => {
    const logs = input.inputPaths.map((p) => {
      const raw = JSON.parse(readFileSync(p, "utf8")) as unknown;
      return parseSarifJson(raw);
    });
    const merged = mergeSarifLogs(logs);
    writeFileSync(
      input.outputPath,
      `${JSON.stringify(merged, null, 2)}\n`,
      "utf8",
    );
    return `Wrote merged SARIF to ${input.outputPath}`;
  },
  {
    name: "merge_findings",
    description:
      "Merge multiple SARIF JSON files into one (deterministic combine of results/rules).",
    schema,
  },
);
