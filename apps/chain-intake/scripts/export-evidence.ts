/**
 * Export a deterministic JSON bundle for Assurance Run --chain-evidence.
 * Sorted by (slot, signature); stable key order in the wrapper object.
 */
import { writeFileSync } from "node:fs";

import { getPool, closePool } from "../src/db.js";

type Row = { signature: string; slot: string; parsed: unknown };

async function main(): Promise<void> {
  const outPath = process.argv[2];
  const pool = getPool();
  const { rows } = await pool.query<Row>(
    `SELECT signature, slot::text, parsed
     FROM helius_parsed_tx
     ORDER BY slot ASC, signature ASC`,
  );

  const bundle = {
    schema_version: "asst_chain_evidence_v1",
    generated_at: new Date().toISOString(),
    network: process.env.CHAIN_NETWORK?.trim() || "solana-mainnet",
    transaction_count: rows.length,
    transactions: rows.map((r) => ({
      signature: r.signature,
      slot: r.slot,
      parsed: r.parsed,
    })),
  };

  const text = `${JSON.stringify(bundle, null, 2)}\n`;
  if (outPath) {
    writeFileSync(outPath, text, "utf8");
    console.error(`Wrote ${outPath} (${rows.length} transactions)`);
  } else {
    process.stdout.write(text);
  }

  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
