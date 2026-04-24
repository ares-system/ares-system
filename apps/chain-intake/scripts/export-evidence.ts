/**
 * Export a deterministic JSON bundle for Assurance Run --chain-evidence.
 * Sorted by (slot, signature); stable key order in the wrapper object.
 *
 * Schema versions:
 *   - asst_chain_evidence_v1 — transactions only (legacy).
 *   - asst_chain_evidence_v2 — transactions + triggers + counts.
 *
 * The manifest writer at deepagentsjs/examples/assurance-run/write-run-manifest.ts
 * accepts both; v2 additionally populates `chain_intelligence.trigger_counts`
 * and `chain_intelligence.trigger_max_severity`.
 */
import { writeFileSync } from "node:fs";

import { getPool, closePool } from "../src/db.js";
import type { ChainTrigger, ChainTriggerKind, Severity } from "../src/triggers.js";
import { summarizeTriggers, maxSeverity } from "../src/triggers.js";

type TxRow = { signature: string; slot: string; parsed: unknown };
type TriggerRow = {
  signature: string;
  slot: string;
  kind: ChainTriggerKind;
  severity: Severity;
  summary: string;
  evidence: Record<string, unknown>;
  detected_at: string;
};

async function main(): Promise<void> {
  const outPath = process.argv[2];
  const pool = getPool();

  const { rows: txRows } = await pool.query<TxRow>(
    `SELECT signature, slot::text, parsed
     FROM helius_parsed_tx
     ORDER BY slot ASC, signature ASC`,
  );

  const { rows: trRows } = await pool.query<TriggerRow>(
    `SELECT signature, slot::text, kind, severity, summary, evidence,
            detected_at::text AS detected_at
     FROM chain_triggers
     ORDER BY slot ASC, signature ASC, kind ASC`,
  );

  const triggers: ChainTrigger[] = trRows.map((r) => ({
    signature: r.signature,
    slot: Number(r.slot),
    kind: r.kind,
    severity: r.severity,
    summary: r.summary,
    evidence: { ...r.evidence, detected_at: r.detected_at },
  }));

  const counts = summarizeTriggers(triggers);
  const worst = maxSeverity(triggers);

  const bundle = {
    schema_version: "asst_chain_evidence_v2",
    generated_at: new Date().toISOString(),
    network: process.env.CHAIN_NETWORK?.trim() || "solana-mainnet",
    transaction_count: txRows.length,
    trigger_count: triggers.length,
    trigger_max_severity: worst ?? null,
    trigger_counts: counts,
    transactions: txRows.map((r) => ({
      signature: r.signature,
      slot: r.slot,
      parsed: r.parsed,
    })),
    triggers: triggers.map((t) => ({
      signature: t.signature,
      slot: t.slot,
      kind: t.kind,
      severity: t.severity,
      summary: t.summary,
      evidence: t.evidence,
    })),
  };

  const text = `${JSON.stringify(bundle, null, 2)}\n`;
  if (outPath) {
    writeFileSync(outPath, text, "utf8");
    console.error(
      `Wrote ${outPath} (${txRows.length} transactions, ${triggers.length} triggers, worst=${worst ?? "none"})`,
    );
  } else {
    process.stdout.write(text);
  }

  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
