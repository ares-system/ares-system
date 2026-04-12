import type pg from "pg";

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

/**
 * Idempotent insert: duplicate signatures from webhook retries are ignored (ON CONFLICT DO NOTHING).
 */
export async function upsertParsedTransactions(
  client: pg.PoolClient,
  txs: HeliusEnhancedTx[],
  source: "webhook" | "backfill",
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
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
  }
  return { inserted, skipped };
}

/** Parse webhook body: Helius sends a JSON array of enhanced transactions. */
export function parseWebhookBody(body: unknown): HeliusEnhancedTx[] {
  if (!Array.isArray(body)) {
    throw new Error("expected JSON array of transactions");
  }
  return body as HeliusEnhancedTx[];
}
