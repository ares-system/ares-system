# HF dataset → fixtures

Dataset: [FraChiacc99/solana-vuln-rust](https://huggingface.co/datasets/FraChiacc99/solana-vuln-rust) (via [Datasets Server](https://huggingface.co/docs/hub/datasets-server) `rows` API).

## Generate JSONL

From the monorepo `deepagentsjs/` root:

```bash
pnpm exec tsx evals/solana-vuln-rust/scripts/fetch-dataset.ts --out evals/solana-vuln-rust/fixtures/train.sample.jsonl --limit 10
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--out` | `evals/solana-vuln-rust/fixtures/train.sample.jsonl` | Output path (created with parent dirs). |
| `--limit` | `205` | Max number of `train` rows to fetch (paged in chunks of 100). |

Defaults write up to **205** rows. Parsing uses `parseFirstTurn()` in `src/parse-dataset-text.ts` to extract the first `[INST]…[/INST]` question and the following assistant text.

## JSONL record shape

Each line is one JSON object (TypeScript: `HfFixtureRow` in `src/fixture-schema.ts`):

| Field | Type | Description |
|-------|------|-------------|
| `rowIdx` | number | Index in the Hub `train` split. |
| `query` | string | First user turn (instruction + Rust snippet). |
| `referenceAnswer` | string | Reference model answer for that turn. |
| `referenceVulnerable` | boolean \| *(omitted)* | `true` / `false` when `referenceIndicatesVulnerable()` can infer a Yes/No label; **omitted** when the label is unknown. |

Example (pretty-printed; on disk it is one line per record):

```json
{
  "rowIdx": 0,
  "query": "Can you check if the following smart contract...",
  "referenceAnswer": "No, it does not contain any vulnerabilities.",
  "referenceVulnerable": false
}
```

The committed `fixtures/train.sample.jsonl` in this repo is a **small subset** for offline unit tests and optional `test:eval` smoke runs; regenerate to refresh from the Hub.
