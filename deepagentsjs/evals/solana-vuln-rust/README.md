# Eval: `solana-vuln-rust` (Hugging Face)

Benchmarks a `deepagents` run against the first-turn question/answer pairs derived from [FraChiacc99/solana-vuln-rust](https://huggingface.co/datasets/FraChiacc99/solana-vuln-rust).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm test` | Unit tests only (`parse-dataset-text`); **no** API keys. Included in monorepo `pnpm test:unit`. |
| `pnpm test:eval` | LangSmith + live LLM (`index.test.ts`); **3** labeled rows; asserts **substantive** agreement with HF polarity (not only the literal word “Yes”), because models sometimes start with “No.” then describe a vulnerability — see `src/eval-agreement.ts`. Requires `EVAL_RUNNER`, `OPENROUTER_API_KEY` (for `openrouter`), `LANGSMITH_API_KEY`. |
| `pnpm fetch-fixture` | Regenerate `fixtures/train.sample.jsonl` from the Datasets Server API (see [`scripts/README.md`](./scripts/README.md)). |

## Environment

```bash
export EVAL_RUNNER=openrouter
export OPENROUTER_API_KEY=...
# optional: OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
export LANGSMITH_API_KEY=...
```

`vitest.config.ts` loads **`deepagentsjs/.env`** (two levels up from this package), so you can keep keys there instead of exporting them in the shell.

## Cost warning

Each `test:eval` run issues **several** model calls. Do not enable this suite in unattended CI unless you intend to pay for tokens.

## See also (LangSmith experiments)

This package uses **`langsmith/vitest`** (reporter + `ls.describe` / `ls.test`) so runs show up as experiments under the configured project. For **programmatic** datasets (`Client.createDataset`, `createExamples`) and **`evaluate()`** with LLM-as-judge (`openevals` / `createLLMAsJudge`), see the [LangSmith evaluation docs](https://docs.langchain.com/langsmith) — that path complements Vitest but is not wired in this repo by default.
