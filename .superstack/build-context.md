# Build context — ASST

> Generated/updated by **review-and-iterate** (2026-04-12). Deep-merge with prior phases if present.

## Stack (observed)

- **On-chain:** None — no `Anchor.toml`, `programs/`, or `*.rs` in this workspace.
- **Off-chain:** `deepagentsjs/` — TypeScript monorepo (LangGraph / LangChain Deep Agents), pnpm, Vitest, GitHub Actions.

## Review summary (`review.*`)

| Field | Value |
|-------|--------|
| `review.security_score` | **C** |
| `review.quality_score` | **B** |
| `review.ready_for_mainnet` | **false** |

### Rationale

- **Security (C):** Solana P0 checks (signer, PDA, checked math, etc.) are **not applicable** — there is no program. Supply-chain issues (`axios` via `@daytonaio/sdk`, `langsmith`) were addressed with **pnpm overrides** in `deepagentsjs/package.json`; **`pnpm audit` reports no known vulnerabilities** after `pnpm install` (2026-04-12).
- **Quality (B):** Upstream-style monorepo with tests, lint, format, CI — appropriate for a library; root repo is mostly docs + vendored subtree.

### `review.findings` (structured)

```json
[
  {
    "severity": "high",
    "category": "Security",
    "description": "No Solana program in repo — review-and-iterate rubric (signer/PDA/math) cannot be applied on-chain.",
    "fix": "Add `programs/<name>/` + Anchor, or point this skill at a repo that contains the on-chain program."
  },
  {
    "severity": "high",
    "category": "Security",
    "description": "Transitive axios <1.15.0 and langsmith <=0.5.17 (see CSO report ASST-2026-04-12).",
    "fix": "pnpm overrides: axios@<1.15.0 → 1.15.0, langsmith@<=0.5.17 → 0.5.18 in deepagentsjs/package.json; run pnpm install && pnpm audit."
  },
  {
    "severity": "low",
    "category": "Documentation",
    "description": "Root `.env` was untracked without a root `.gitignore`.",
    "fix": "Added root `.gitignore` with `.env` patterns."
  }
]
```

## Pipeline (Solana data → Assurance Run)

Goal: **extend Assurance Run** with optional **on-chain intelligence** (hashed evidence bundle) for future **pre-alert** use cases (e.g. DeFi program monitoring: transactions/logs, account drift, token flows). Ingestion and storage are **provider-agnostic** at the schema level; **Helius webhooks** are the recommended MVP ingestion path for parsed, subscription-friendly delivery.

Structured fields (phase handoff):

```json
{
  "pipeline": {
    "ingestion_method": "webhook",
    "data_types": [
      "transactions",
      "program-logs",
      "account-state",
      "token-transfers"
    ],
    "storage": "postgresql",
    "backfill_implemented": true
  }
}
```

| Field | Value | Notes |
|-------|--------|--------|
| `pipeline.ingestion_method` | `webhook` | MVP: Helius webhook → HTTPS receiver; idempotent writes by `(signature, slot)` or provider id. |
| `pipeline.data_types` | see JSON | Covers program-level alerts, state snapshots, and SPL movements for hijack-style signals. |
| `pipeline.storage` | `postgresql` | Query-friendly history + indexes; Redis optional for hot state / dedup cache. |
| `pipeline.backfill_implemented` | `true` | **Reference implementation:** [`apps/chain-intake`](../apps/chain-intake) — Helius `GET /v0/addresses/{address}/transactions` pagination + `pipeline_backfill_cursor` table. Run `pnpm run backfill` after deploy. |

**Manifest linkage:** `deepagentsjs/examples/assurance-run` records optional `chain_intelligence` on the v1 manifest (`evidence_bundle_sha256` of merged **parsed** JSON — not raw transaction blobs). CLI: `write-run-manifest.ts --chain-evidence <file>`. **Export parsed bundle:** `apps/chain-intake` → `pnpm run export-evidence -- <out.json>`.

**Non-negotiables (from build-data-pipeline):** idempotent writes; backfill mechanism; store **slot** with each record; monitor ingestion lag.

## Next steps (optional)

- **On-chain:** Scaffold or link a program, then re-run **review-and-iterate** (or `solana-vulnerability-scanner`) against `programs/`.
- **Off-chain:** `cd deepagentsjs && pnpm install && pnpm audit && pnpm test` after overrides.
- **Pipeline:** Operate [`apps/chain-intake`](../apps/chain-intake) (webhook + backfill + export); add alerts for ingestion lag / failed webhook responses.
