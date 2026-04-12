-- Parsed Helius enhanced transactions (webhook or backfill). Idempotent on signature.
CREATE TABLE IF NOT EXISTS helius_parsed_tx (
  signature TEXT PRIMARY KEY,
  slot BIGINT NOT NULL,
  parsed JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'webhook',
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS helius_parsed_tx_slot_idx ON helius_parsed_tx (slot);

-- Optional: resume token for incremental backfill (one row per deployment / watch address).
CREATE TABLE IF NOT EXISTS pipeline_backfill_cursor (
  watch_address TEXT PRIMARY KEY,
  last_before_signature TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
