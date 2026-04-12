# On-chain digest scaffold (P5)

Commits a hash of the assurance bundle (e.g. manifest + merged SARIF SHA) to Solana via a **memo** or small program instruction — see [docs/DASHBOARD-UX.en.md](../../docs/DASHBOARD-UX.en.md) §9.

## Prerequisites

- `SOLANA_RPC_URL` (default devnet)
- Keypair path for fee payer (**never** commit keys)

## Usage

```bash
cd deepagentsjs
pnpm exec tsx examples/onchain-digest/write-digest.ts \
  --manifest-sha256 <hex> \
  --keypair ~/.config/solana/id.json
```

This script is a **scaffold**: wire your preferred program or `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` after local testing.
