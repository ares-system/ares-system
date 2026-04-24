# @asst/cli

Interactive terminal client for the ASST security stack.

## Commands

```bash
asst                    # interactive command picker
asst init               # create/append API keys to .env.local
asst chat               # multi-agent chat session
asst scan               # deterministic 6-agent full scan (TUI)
asst scan --json        # machine-readable output for CI/CD
asst watch              # file-watching continuous scan
asst diff               # compare two assurance manifests
asst skills             # list installed skills (.agents/skills/)
```

All commands accept:

- `-r / --repo <path>` — target repository (default: `process.cwd()`)
- `-m / --model <id>`  — orchestrator model id (see below), overrides config

## Model configuration

The orchestrator model is resolved in this order:

1. `--model` CLI flag
2. `.asst/config.json` → `"model"` field
3. `$ASST_ORCHESTRATOR_MODEL` env var
4. `google:gemini-2.5-flash` (default)

Supported providers:

| Prefix       | Example                                      | Requires                    |
| ------------ | -------------------------------------------- | --------------------------- |
| `google:`    | `google:gemini-2.5-flash`                    | `GOOGLE_API_KEY`            |
| `openrouter:`| `openrouter:nvidia/nemotron-nano-9b-v2:free` | `OPENROUTER_API_KEY`        |
| `openai:`    | `openai:gpt-4o-mini`                         | `OPENAI_API_KEY`            |
| `ollama:`    | `ollama:llama3.1`                            | Ollama at `:11434` (no key) |
| `local:`     | `local:mistral-7b@http://localhost:1234/v1`  | `ASST_LOCAL_BASE_URL`       |

The `init` command is provider-aware: it only prompts for the key that the
currently-configured model actually needs. Ollama / `local:` users are never
prompted for a cloud key.

## Layout

```
src/
├── asst.ts                 Entry point. Command dispatch + key prompt hook.
├── commands/
│   ├── chat.ts             Interactive chat loop.
│   ├── scan.ts             TUI + JSON deterministic scan.
│   ├── watch.ts            File watcher → incremental scans.
│   ├── diff.ts             Manifest diff viewer.
│   └── skills.ts           List/inspect installed skills.
├── ui/
│   ├── theme.ts            Colour palette.
│   └── components/         Reusable TUI primitives (Banner, Panel, Table…).
└── __tests__/              Unit tests for deterministic engine logic.
```

## HITL hook

The CLI installs a `globalThis.ARES_ASK_PERMISSION` handler on startup that
prompts the user via `@clack/prompts.confirm` whenever an agent wants to use
`write_file` or `run_terminal_cmd`. This is the ONLY path by which mutating
tools can act. Disable tool mutations entirely with `ASST_ALLOW_WRITE=0`.

## Build + run

```bash
pnpm --filter @asst/cli build   # compile to dist/
pnpm --filter @asst/cli start   # node dist/asst.js
pnpm --filter @asst/cli dev     # tsx src/asst.ts (no compile)
```

Tests:

```bash
pnpm --filter @asst/cli test
```

## Launchers

- `Launch_ASST.bat` (Windows): forwards `ARES_REPO_ROOT` and opens `cmd /k`.
- `launch-asst.sh` (macOS / Linux): same contract for POSIX shells.
