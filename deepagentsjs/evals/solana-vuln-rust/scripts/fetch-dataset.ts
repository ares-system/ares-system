#!/usr/bin/env node
/**
 * Download rows from Hugging Face Datasets Server API and write JSONL fixtures.
 *
 * Usage (from deepagentsjs/):
 *   pnpm exec tsx evals/solana-vuln-rust/scripts/fetch-dataset.ts --out evals/solana-vuln-rust/fixtures/train.sample.jsonl --limit 205
 *
 * @see https://huggingface.co/docs/hub/datasets-server
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { HfFixtureRow } from "../src/fixture-schema.js";
import {
  parseFirstTurn,
  referenceIndicatesVulnerable,
} from "../src/parse-dataset-text.js";

const DATASET = "FraChiacc99/solana-vuln-rust";
const BASE = "https://datasets-server.huggingface.co/rows";
const PAGE = 100;

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RowsResponse {
  rows: Array<{ row_idx: number; row: { text: string } }>;
  num_rows_total?: number;
}

function parseArgs(): { out: string; limit: number } {
  const args = process.argv.slice(2);
  let out = resolve(__dirname, "../fixtures/train.sample.jsonl");
  let limit = 205;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out" && args[i + 1]) {
      out = resolve(process.cwd(), args[++i]);
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = Math.max(1, parseInt(args[++i], 10) || 205);
    }
  }
  return { out, limit };
}

async function fetchPage(offset: number, length: number): Promise<RowsResponse> {
  const u = new URL(BASE);
  u.searchParams.set("dataset", DATASET);
  u.searchParams.set("config", "default");
  u.searchParams.set("split", "train");
  u.searchParams.set("offset", String(offset));
  u.searchParams.set("length", String(length));
  const res = await fetch(u);
  if (!res.ok) {
    throw new Error(`HF API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as RowsResponse;
}

async function main(): Promise<void> {
  const { out, limit } = parseArgs();
  const lines: string[] = [];
  let offset = 0;
  while (offset < limit) {
    const length = Math.min(PAGE, limit - offset);
    const data = await fetchPage(offset, length);
    for (const { row_idx, row } of data.rows) {
      if (row_idx >= limit) break;
      const parsed = parseFirstTurn(row.text);
      if (!parsed) continue;
      const refV = referenceIndicatesVulnerable(parsed.referenceAnswer);
      const record: HfFixtureRow = {
        rowIdx: row_idx,
        query: parsed.query,
        referenceAnswer: parsed.referenceAnswer,
      };
      if (refV !== null) {
        record.referenceVulnerable = refV;
      }
      lines.push(JSON.stringify(record));
    }
    offset += data.rows.length;
    if (data.rows.length === 0) break;
    if (offset >= limit) break;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  console.log(`Wrote ${lines.length} lines to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
