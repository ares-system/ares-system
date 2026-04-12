# Chain intake (Helius → PostgreSQL → Assurance Run)

Small **HTTPS webhook receiver** plus **idempotent PostgreSQL storage**, **Helius Enhanced Transactions backfill**, and a **deterministic JSON export** for [`write-run-manifest.ts --chain-evidence`](../../deepagentsjs/examples/assurance-run/write-run-manifest.ts).

Helius may **retry deliveries**; duplicates are dropped with `ON CONFLICT (signature) DO NOTHING` (same signature always identifies one on-chain transaction).

## Docs (Helius)

- [Webhooks overview](https://www.helius.dev/docs/webhooks) — retries & duplicate delivery
- [Enhanced Transactions — transaction history](https://www.helius.dev/docs/enhanced-transactions/transaction-history) — backfill pagination (`before-signature`, `limit`)
- [Enhanced Transactions — parse transactions](https://www.helius.dev/docs/enhanced-transactions/parse-transactions) — batch parse by signature

## Setup

1. Create a database and apply the schema:

   ```bash
   psql "$DATABASE_URL" -f sql/001_init.sql
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `HELIUS_API_KEY`, `WATCH_ADDRESS`.

3. Install and run the HTTP server (Fly.io, Railway, or local):

   ```bash
   pnpm install
   pnpm start
   ```

4. In the [Helius dashboard](https://dashboard.helius.dev/), create a webhook whose **URL** points at your deployed service, e.g.  
   `https://<host>/webhooks/helius`  
   Optionally append `?secret=<WEBHOOK_SHARED_SECRET>` and set the same value in `.env` so only requests with that secret are accepted.

5. **Backfill** after deploy (or on a schedule) so you recover history missed during downtime:

   ```bash
   pnpm run backfill
   ```

   Uses `GET /v0/addresses/{WATCH_ADDRESS}/transactions` with pagination (see Helius docs above). Cursor metadata is stored in `pipeline_backfill_cursor` for observability; extend the script if you need strict resume-from-cursor behavior.

6. **Export** merged parsed JSON for Assurance Run:

   ```bash
   pnpm run export-evidence -- ../../assurance/chain-evidence.json
   cd ../../deepagentsjs && pnpm exec tsx examples/assurance-run/write-run-manifest.ts --cwd .. --chain-evidence ../assurance/chain-evidence.json
   ```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `HELIUS_API_KEY` | Backfill API calls |
| `WATCH_ADDRESS` | Same base address as in the Helius webhook (program, wallet, etc.) |
| `PORT` | HTTP port (default `8787`) |
| `WEBHOOK_SHARED_SECRET` | Optional; require `Authorization: Bearer …` or `?secret=` |
| `BACKFILL_MAX_PAGES` | Optional safety cap on pagination loops |
| `CHAIN_NETWORK` | Optional string in exported evidence (default `solana-mainnet`) |

## Docker

```bash
docker build -t chain-intake .
docker run --env-file .env -p 8787:8787 chain-intake
```

## Idempotency

- **Primary key:** Solana transaction `signature` (unique chain-wide).
- **Slot** stored for ordering and debugging; duplicates always share the same signature, so retries do not create duplicate rows.
