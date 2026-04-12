import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { getPool } from "./db.js";
import { parseWebhookBody, upsertParsedTransactions } from "./ingest.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

/**
 * Helius Enhanced / Raw webhooks POST a JSON array of transactions.
 * @see https://www.helius.dev/docs/webhooks
 */
app.post("/webhooks/helius", async (c) => {
  const secret = process.env.WEBHOOK_SHARED_SECRET?.trim();
  if (secret) {
    const auth = c.req.header("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const q = c.req.query("secret");
    if (bearer !== secret && q !== secret) {
      return c.json({ error: "unauthorized" }, 401);
    }
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  let txs;
  try {
    txs = parseWebhookBody(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 400);
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    const { inserted, skipped } = await upsertParsedTransactions(
      client,
      txs,
      "webhook",
    );
    return c.json({
      ok: true,
      received: txs.length,
      inserted,
      skipped_duplicates: skipped,
    });
  } finally {
    client.release();
  }
});

const port = Number(process.env.PORT ?? "8787");
serve({ fetch: app.fetch, port });
console.error(`chain-intake listening on :${port} (POST /webhooks/helius)`);
