# Assurance Run — P0 manifest (`assurance/run-*.json`)

Writes a **versioned JSON manifest** bound to the current **git** commit (and optional lockfile / merged-artifact hashes). This is the first code artifact for [Assurance Run](../../../WHITEPAPER.en.md); schema is internal and may evolve with a new `schema_version`.

## Manifest schema

- **Zod (source of truth):** [`src/manifest-schema.ts`](./src/manifest-schema.ts)
- **JSON Schema (interop):** [`schema/assurance-run-manifest.v1.schema.json`](./schema/assurance-run-manifest.v1.schema.json)

## Optional: OpenRouter smoke (`ChatOpenRouter` + `createDeepAgent`)

Assurance Run’s **primary LLM path** for ASST is [LangChain `ChatOpenRouter`](https://docs.langchain.com/oss/javascript/integrations/chat/openrouter). Copy `deepagentsjs/.env.example` to `deepagentsjs/.env`, set `OPENROUTER_API_KEY`, optionally `OPENROUTER_MODEL`, then from `deepagentsjs/`:

```bash
pnpm exec tsx examples/assurance-run/openrouter-smoke.ts
```

If `OPENROUTER_API_KEY` is unset, the script **exits 0** and prints a skip message (safe for CI without secrets). With a key, it runs one direct model call and one minimal `createDeepAgent` invoke.

### Optional: LangSmith tracing

Set tracing env vars from `deepagentsjs/.env.example` (e.g. `LANGCHAIN_TRACING_V2=true`, `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`, optionally `LANGSMITH_PROJECT`), then run the smoke command above — traces appear in the [LangSmith](https://smith.langchain.com) UI for the same OpenRouter calls.

## Write a manifest

From the `deepagentsjs/` directory:

```bash
pnpm exec tsx examples/assurance-run/write-run-manifest.ts
```

Options:

| Flag | Meaning |
|------|---------|
| `--cwd <path>` | Repository root (default: current working directory) |
| `--out <dir>` | Subdirectory under cwd for output (default: `assurance`) |
| `--merged <file>` | If set, record SHA-256 of that file under `artifact_hashes.merged_json_sha256` |
| `--notes <text>` | Optional free-form notes |
| `--no-supply-chain` | Skip P3 lane (no `pnpm audit`, no `supply-chain-merged.json`) |
| `--no-rust` | Skip `cargo audit` attempt (npm audit still runs when a lockfile is found) |
| `--chain-evidence <file>` | If set, SHA-256 of that file is recorded under `chain_intelligence` (status `ok`, ingestion `webhook`). Use for merged **parsed** Solana pipeline output (not raw RPC blobs). |

### Chain intelligence (Solana pipeline)

The manifest can optionally include **`chain_intelligence`**: a hash of merged, parsed on-chain evidence produced by your ingestion pipeline (see repo [`.superstack/build-context.md`](../../../.superstack/build-context.md) **Pipeline** section). Typical flow: webhook receiver → normalize/dedupe by `(signature, slot)` → store/query → export merged JSON → `--chain-evidence` when writing the Assurance Run manifest.

When the evidence bundle is **`asst_chain_evidence_v2`** (produced by [`apps/chain-intake`](../../../apps/chain-intake/README.md) ≥ 0.1.1), the manifest writer additionally extracts the derived anomaly summary into `chain_intelligence`:

| Field                       | Meaning                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `evidence_schema_version`   | Passed through from the bundle (e.g. `asst_chain_evidence_v2`).                          |
| `transaction_count`         | Number of txs covered (informational).                                                    |
| `trigger_counts`            | `{ total, by_kind, by_severity }` — deterministic counts over detected triggers.          |
| `trigger_max_severity`      | Highest severity across all triggers (`critical` / `high` / `medium` / `low` / `info`), or `null` when none. |
| `trigger_kinds`             | Sorted unique list of rule ids that fired (e.g. `program_upgrade`, `large_native_transfer`). |

CI gates can now fail the job when `trigger_max_severity` exceeds a policy threshold, without re-parsing the evidence file.

Legacy `asst_chain_evidence_v1` bundles are still accepted; the writer just records `evidence_bundle_sha256` without trigger fields.

Output files:

- `assurance/run-<timestamp>.json` — manifest (UTC timestamp in the filename).
- `assurance/supply-chain-merged.json` — **P3** merged supply-chain document (`pnpm audit --json` summary; optional `cargo audit` when `Cargo.lock` exists and `cargo` is on `PATH`).

The manifest’s `supply_chain` field repeats the **advisory summary** (npm severity counts, rust skip/ok) and **SHA-256** of `supply-chain-merged.json` so the bundle is commit-bound.

## Reproducibility

- **`git.commit_sha` / `git.ref` / `git.dirty`:** from `git rev-parse` and `git status --porcelain`.
- **`tools`:** at minimum `node` and `pnpm` when available; **P3** adds `pnpm_audit` (and `cargo_audit` when the Rust lane runs).
- **`artifact_hashes.lockfiles`:** SHA-256 of `pnpm-lock.yaml`, `package-lock.json`, or `Cargo.lock` when present at repo root.

## Testing policy (no mocks)

Tests must **not** mock modules or I/O. Use real filesystem fixtures, real `mergeSarifLogs` inputs, and `write-manifest.int.test.ts` runs the **real** `write-run-manifest.ts` via `pnpm exec tsx`. Semgrep in tests uses the binary on `PATH` when present (skipped path is exercised when absent).

## Import in TypeScript

```typescript
import { parseAssuranceRunManifestV1 } from "./src/manifest-schema.js";
```

After building or from the same package layout, validate unknown JSON with `parseAssuranceRunManifestV1`.

## CI (GitHub Actions)

**Default library CI:** [.github/workflows/deepagentsjs-ci.yml](../../../.github/workflows/deepagentsjs-ci.yml) runs **build**, **typecheck**, and **unit tests** on PRs and pushes to `main` (paths under `deepagentsjs/`). No repository secrets required.

**Assurance Run (evidence bundle):** on **pull requests**, [.github/workflows/assurance-run-pr.yml](../../../.github/workflows/assurance-run-pr.yml) (repo root) runs:

1. **Optional OpenRouter smoke** — when the repository secret `OPENROUTER_API_KEY` is set, runs `pnpm exec tsx examples/assurance-run/openrouter-smoke.ts` after install (skipped when the secret is absent).
2. **Build-verify lane** — same *idea* as [examples/sandbox/local-sandbox.ts](../sandbox/local-sandbox.ts) (**isolated working directory** + shell commands), aligned with [WHITEPAPER.en.md § 10](../../../WHITEPAPER.en.md#10-integration-tools-and-execution-surface) **§A/C** (`execute` via sandbox; build-verify lane).
3. **P3 supply chain** — `pnpm audit --json` via the default manifest writer (writes `supply-chain-merged.json` and `supply_chain` on the run manifest).
4. **Commit-bound manifest** — `pnpm exec tsx examples/assurance-run/write-run-manifest.ts --cwd ${{ github.workspace }}` so `git.commit_sha` matches the checked-out PR head.
5. **Artifact** — uploads `assurance/` (JSON) for download from the Actions run.

Manifests under repo-root `assurance/` are produced in CI for artifacts; adjust `.gitignore` if you do not want local runs committed.
