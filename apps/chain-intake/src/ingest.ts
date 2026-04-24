import type pg from "pg";

import {
  classifyHeliusTransaction,
  summarizeTriggers,
  type ChainTrigger,
  type ClassifyOptions,
  type TriggerCounts,
} from "./triggers.js";

/** One Helius enhanced transaction object (webhook array element or history API row). */
export type HeliusEnhancedTx = {
  signature?: string;
  slot?: number;
  [key: string]: unknown;
};

function requireSigSlot(tx: HeliusEnhancedTx): { signature: string; slot: number } {
  const signature =
    typeof tx.signature === "string" ? tx.signature.trim() : "";
  const slot = typeof tx.slot === "number" && Number.isFinite(tx.slot) ? tx.slot : NaN;
  if (!signature) throw new Error("missing signature in Helius transaction object");
  if (!Number.isFinite(slot)) throw new Error("missing or invalid slot");
  return { signature, slot };
}

/** Optional knobs for classifier + watchAddress from env. */
function readClassifyOptionsFromEnv(): ClassifyOptions {
  const opts: ClassifyOptions = {};
  const watch = process.env.WATCH_ADDRESS?.trim();
  if (watch) opts.watchAddresses = [watch];
  const nat = Number(process.env.CHAIN_LARGE_NATIVE_LAMPORTS);
  if (Number.isFinite(nat) && nat > 0) opts.largeNativeLamports = nat;
  const tok = Number(process.env.CHAIN_LARGE_TOKEN_UI_AMOUNT);
  if (Number.isFinite(tok) && tok > 0) opts.largeTokenUiAmount = tok;
  return opts;
}

/**
 * Idempotent insert: duplicate signatures from webhook retries are ignored (ON CONFLICT DO NOTHING).
 *
 * When `classify: true` (default), also runs the trigger classifier against
 * each inserted tx and upserts findings into `chain_triggers`. Retries are
 * no-ops because (signature, kind) is the PK.
 */
export async function upsertParsedTransactions(
  client: pg.PoolClient,
  txs: HeliusEnhancedTx[],
  source: "webhook" | "backfill",
  options: {
    classify?: boolean;
    classifyOptions?: ClassifyOptions;
  } = {},
): Promise<{
  inserted: number;
  skipped: number;
  triggersInserted: number;
  triggerCounts: TriggerCounts;
}> {
  const classify = options.classify ?? true;
  const classifyOptions = options.classifyOptions ?? readClassifyOptionsFromEnv();

  let inserted = 0;
  let skipped = 0;
  const allTriggers: ChainTrigger[] = [];

  for (const tx of txs) {
    const { signature, slot } = requireSigSlot(tx);
    const parsed = JSON.stringify(tx);
    const r = await client.query(
      `INSERT INTO helius_parsed_tx (signature, slot, parsed, source)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (signature) DO NOTHING
       RETURNING signature`,
      [signature, slot, parsed, source],
    );
    if (r.rowCount === 1) inserted += 1;
    else skipped += 1;

    if (classify) {
      const triggers = classifyHeliusTransaction(tx, classifyOptions);
      for (const t of triggers) allTriggers.push(t);
    }
  }

  let triggersInserted = 0;
  if (classify && allTriggers.length > 0) {
    triggersInserted = await upsertTriggers(client, allTriggers);
  }

  return {
    inserted,
    skipped,
    triggersInserted,
    triggerCounts: summarizeTriggers(allTriggers),
  };
}

/**
 * Idempotent upsert into `chain_triggers`. Same (signature, kind) is treated
 * as "already classified" and skipped — we don't overwrite an earlier
 * classification on retry.
 */
export async function upsertTriggers(
  client: pg.PoolClient,
  triggers: readonly ChainTrigger[],
): Promise<number> {
  let inserted = 0;
  for (const t of triggers) {
    const r = await client.query(
      `INSERT INTO chain_triggers
         (signature, kind, severity, summary, evidence, slot)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (signature, kind) DO NOTHING
       RETURNING signature`,
      [
        t.signature,
        t.kind,
        t.severity,
        t.summary,
        JSON.stringify(t.evidence),
        t.slot,
      ],
    );
    if (r.rowCount === 1) inserted += 1;
  }
  return inserted;
}

/** Parse webhook body: Helius sends a JSON array of enhanced transactions. */
export function parseWebhookBody(body: unknown): HeliusEnhancedTx[] {
  if (!Array.isArray(body)) {
    throw new Error("expected JSON array of transactions");
  }
  return body as HeliusEnhancedTx[];
}
