import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as ls from "langsmith/vitest";
import { expect } from "vitest";
import { getDefaultRunner, getFinalText } from "@deepagents/evals";

import {
  textAgreesSafeReference,
  textAgreesVulnerableReference,
} from "./src/eval-agreement.js";
import type { HfFixtureRow } from "./src/fixture-schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Rows with a definite boolean label (required for Yes/No eval assertions). */
type LabeledRow = Pick<
  HfFixtureRow,
  "rowIdx" | "query" | "referenceVulnerable"
> & { referenceVulnerable: boolean };

function loadSampleRows(max = 3): LabeledRow[] {
  const path = join(__dirname, "fixtures/train.sample.jsonl");
  const raw = readFileSync(path, "utf8");
  const rows: LabeledRow[] = [];
  for (const line of raw.trim().split("\n")) {
    if (!line) continue;
    const o = JSON.parse(line) as HfFixtureRow;
    if (typeof o.referenceVulnerable !== "boolean") continue;
    rows.push({
      rowIdx: o.rowIdx,
      query: o.query,
      referenceVulnerable: o.referenceVulnerable,
    });
    if (rows.length >= max) break;
  }
  return rows;
}

const VULN_SYSTEM_PROMPT =
  "You review Rust smart contract snippets for security issues. " +
  "Respond in plain text only. Start your answer with exactly Yes or No as the first word " +
  "(Yes = at least one security vulnerability is present, No = none). " +
  "Then briefly explain. Do not call tools or use a filesystem.";

const suiteName = "deepagents-solana-vuln-rust-hf";
const samples = loadSampleRows(3);

ls.describe(
  suiteName,
  () => {
    const runner = getDefaultRunner();
    const vulnRunner = runner.extend({ systemPrompt: VULN_SYSTEM_PROMPT });

    for (const ex of samples) {
      ls.test(
        `row ${ex.rowIdx}: polarity vs reference (vuln=${ex.referenceVulnerable})`,
        {
          inputs: { query: ex.query.slice(0, 2000) },
          referenceOutputs: {
            referenceVulnerable: ex.referenceVulnerable,
          },
        },
        async ({ inputs }) => {
          const result = await vulnRunner.run({
            query: inputs.query as string,
          });

          const finalText = getFinalText(result);
          if (ex.referenceVulnerable) {
            expect(
              textAgreesVulnerableReference(finalText),
              `expected model to agree vulnerable=true (Yes prefix or affirmative vuln description)\n${finalText.slice(0, 1200)}`,
            ).toBe(true);
          } else {
            expect(
              textAgreesSafeReference(finalText),
              `expected model to agree vulnerable=false (No / no vuln)\n${finalText.slice(0, 1200)}`,
            ).toBe(true);
          }

          ls.logFeedback({
            key: "row_idx",
            score: ex.rowIdx,
          });
          ls.logFeedback({
            key: "agent_steps",
            score: result.steps.length,
          });
        },
      );
    }
  },
  { projectName: process.env.EVAL_RUNNER ?? "openrouter", upsert: true },
);
