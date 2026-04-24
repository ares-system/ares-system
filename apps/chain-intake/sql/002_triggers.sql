-- Chain anomaly triggers derived from parsed Helius transactions.
-- Idempotent on (signature, kind) so re-classifying the same tx is a no-op.
-- Deleting the underlying parsed tx cascades to its triggers.
CREATE TABLE IF NOT EXISTS chain_triggers (
  signature   TEXT NOT NULL
    REFERENCES helius_parsed_tx(signature) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  severity    TEXT NOT NULL,
  summary     TEXT NOT NULL,
  evidence    JSONB NOT NULL,
  slot        BIGINT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (signature, kind)
);

CREATE INDEX IF NOT EXISTS chain_triggers_detected_at_idx
  ON chain_triggers (detected_at DESC);
CREATE INDEX IF NOT EXISTS chain_triggers_severity_idx
  ON chain_triggers (severity);
CREATE INDEX IF NOT EXISTS chain_triggers_slot_idx
  ON chain_triggers (slot);
