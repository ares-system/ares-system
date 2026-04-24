/**
 * Backfill parsed transactions for a watched address using Helius Enhanced Transactions
 * (transaction history + pagination). Same rows as webhooks → same idempotency on signature.
 *
 * @see https://www.helius.dev/docs/enhanced-transactions/transaction-history
 */
import { getPool, closePool } from "../src/db.js";
import { upsertParsedTransactions, type HeliusEnhancedTx } from "../src/ingest.js";

const DEFAULT_BASE = "https://api-mainnet.helius-rpc.com";

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function fetchHistoryPage(
  base: string,
  apiKey: string,
  address: string,
  beforeSignature: string | undefined,
  limit: number,
): Promise<HeliusEnhancedTx[]> {
  const u = new URL(`${base}/v0/addresses/${encodeURIComponent(address)}/transactions`);
  u.searchParams.set("api-key", apiKey);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("sort-order", "desc");
  if (beforeSignature) u.searchParams.set("before-signature", beforeSignature);

  const res = await fetch(u);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Helius HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error(`expected array from Helius, got ${typeof data}`);
  }
  return data as HeliusEnhancedTx[];
}

async function main(): Promise<void> {
  const apiKey = env("HELIUS_API_KEY");
  const address = env("WATCH_ADDRESS");
  const base = process.env.HELIUS_API_BASE?.trim() || DEFAULT_BASE;
  const limit = Math.min(
    100,
    Math.max(1, Number(process.env.BACKFILL_LIMIT ?? "100") || 100),
  );
  const maxPages = process.env.BACKFILL_MAX_PAGES
    ? Math.max(1, Number(process.env.BACKFILL_MAX_PAGES) || 1)
    : Infinity;

  const pool = getPool();
  let beforeSignature: string | undefined;
  let page = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalTriggers = 0;

  while (page < maxPages) {
    const batch = await fetchHistoryPage(base, apiKey, address, beforeSignature, limit);
    if (batch.length === 0) break;

    const client = await pool.connect();
    try {
      const { inserted, skipped, triggersInserted } =
        await upsertParsedTransactions(client, batch, "backfill");
      totalInserted += inserted;
      totalSkipped += skipped;
      totalTriggers += triggersInserted;

      const lastSig = batch[batch.length - 1]?.signature;
      if (typeof lastSig === "string") {
        beforeSignature = lastSig;
        await client.query(
          `INSERT INTO pipeline_backfill_cursor (watch_address, last_before_signature, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (watch_address) DO UPDATE
           SET last_before_signature = EXCLUDED.last_before_signature, updated_at = now()`,
          [address, lastSig],
        );
      }
    } finally {
      client.release();
    }

    page += 1;
    console.error(
      `page ${page}: batch=${batch.length} inserted=${totalInserted} skipped=${totalSkipped} triggers=${totalTriggers}`,
    );

    if (batch.length < limit) break;
  }

  console.error(
    JSON.stringify({
      ok: true,
      pages: page,
      inserted: totalInserted,
      skipped_duplicates: totalSkipped,
      triggers_inserted: totalTriggers,
      watch_address: address,
    }),
  );

  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
