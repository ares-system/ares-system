# ASST — ARES Solana Security Tool

**ARES Solana Security Tool** (**ASST**) — a multi-agent security stack for
teams shipping Solana (and related) software. Deployed as **Assurance Run**:
orchestrated checks + commit-bound evidence, not a one-shot "audit".

> **New here? Start with [`REPO_MAP.md`](./REPO_MAP.md) and
> [`ARCHITECTURE.md`](./ARCHITECTURE.md).**

## What ASST does

Given a Solana repository, ASST can:

1. Run a **deterministic 6-agent full scan** — Solana vulnerabilities,
   DeFi security, rug-pull risk, secret hygiene, supply chain, report synthesis.
2. Chat interactively — the orchestrator delegates to the right sub-agent.
3. Emit **assurance manifests**: signed-ish JSON bundles of tool output
   + SARIF + git metadata, reproducible across runs.
4. Expose the same tools to Cursor / Claude Desktop via **MCP**.
5. Surface everything in a **web dashboard** (future public product).

## Architecture at a glance

```
           ┌────────────────────────────────────────────────┐
           │                 @ares/engine                   │  ← single source of
           │  orchestrator · 6 sub-agents · assurance tools │    truth for agent
           │  model factory · skills loader · sqlite store  │    logic
           └────────────────────────────────────────────────┘
                                   ▲
               ┌───────────────────┼───────────────────┬────────────────────┐
               │                   │                   │                    │
         ┌──────────┐       ┌─────────────┐      ┌────────────┐      ┌────────────┐
         │ @asst/cli│       │  @asst/web  │      │@asst/mcp-  │      │@asst/chain-│
         │ (terminal)│      │  (Next.js)  │      │ server     │      │ intake     │
         └──────────┘       └─────────────┘      └────────────┘      └────────────┘
              HITL              public API           stdio MCP          Helius → PG
            prompts          (read-only by          (read-only
                              default)               tools only)
```

- **All agent logic** lives in `packages/engine/` (`@ares/engine`).
- **Every surface** (CLI, web, MCP) imports from `@ares/engine`. No duplication.
- **Public surfaces** (web) default to read-only; mutating tools require
  explicit opt-in + per-call HITL confirmation.

## Layout

| Path                | What                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `packages/engine/`  | `@ares/engine` — orchestrator, sub-agents, tools, persistence, skills loader. See [`packages/engine/README.md`](./packages/engine/README.md). |
| `apps/asst-cli/`    | `asst` terminal client. See [`apps/asst-cli/README.md`](./apps/asst-cli/README.md). |
| `apps/web/`         | Next.js dashboard + `/api/*` routes. See [`apps/web/README.md`](./apps/web/README.md). |
| `apps/mcp-server/`  | MCP stdio server for Cursor / Claude. See [`apps/mcp-server/README.md`](./apps/mcp-server/README.md). |
| `apps/chain-intake/`| Helius webhook receiver + backfill. See [`apps/chain-intake/README.md`](./apps/chain-intake/README.md). |
| `deepagentsjs/`     | Vendored LangGraph engine + runnable examples (incl. assurance-run manifest writer). |
| `.agents/skills/`   | Canonical skills directory loaded by the engine.                     |
| `docs/`             | PRD, dashboard UX specs, internal design notes.                      |

Every directory above has its own `README.md`.

## Quick start

```bash
# From repo root
pnpm install
pnpm -r build

# Interactive CLI (Windows)
./Launch_ASST.bat

# Interactive CLI (macOS / Linux)
./launch-asst.sh

# Web dashboard
pnpm --filter @asst/web dev    # http://localhost:3000

# MCP server (wire into Cursor / Claude Desktop)
pnpm --filter @asst/mcp-server start
```

Copy `.env.example` to `.env.local` and fill in the keys you need. Only the
provider matching your chosen orchestrator model is required — Ollama /
local-model users don't need any cloud keys.

## Model choice (SDK/CLI + web)

The orchestrator model is configurable, never hardcoded. Supported:

- `google:gemini-2.5-flash` — default, needs `GOOGLE_API_KEY`
- `openrouter:<model>` — needs `OPENROUTER_API_KEY`
- `openai:<model>` — OpenAI or any OpenAI-compatible endpoint
- `ollama:<model>` — local, no key required
- `local:<model>@<baseUrl>` — LM Studio etc.

Set via `--model`, `.asst/config.json`, or `$ASST_ORCHESTRATOR_MODEL`.
Full list in [`packages/engine/README.md`](./packages/engine/README.md).

## Security model

The public surface rule is: **read-only by default, mutations require HITL**.

- Mutating tools (`write_file`, `run_terminal_cmd`) are produced by a factory
  that calls a permission callback before every write/exec.
- The CLI installs an interactive prompt. The web uses a default-deny hook,
  disabled entirely unless `ASST_WEB_ALLOW_WRITE=1` is set on the server.
- The MCP server doesn't register mutating tools at all.

Details: [`packages/engine/README.md` § Security model](./packages/engine/README.md).

## Documentation index

| Document                                 | Purpose                                    |
| ---------------------------------------- | ------------------------------------------ |
| [`REPO_MAP.md`](./REPO_MAP.md)           | Directory-by-directory navigation          |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)   | System design (delegates to WHITEPAPER §9) |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)   | Dev workflow, conventions, how to add things |
| [`WHITEPAPER.en.md`](./WHITEPAPER.en.md) | Product narrative (EN)                     |
| [`WHITEPAPER.id.md`](./WHITEPAPER.id.md) | Product narrative (ID)                     |
| [`TOOLS.md`](./TOOLS.md)                 | Tool catalog + citations                   |
| [`COMPETITORS.md`](./COMPETITORS.md)     | Market landscape                           |
| [`PRD.md`](./PRD.md)                     | Product requirements                       |
| [`WALKTHROUGH.md`](./WALKTHROUGH.md)     | Demo script                                |
| [`docs/PRD.md`](./docs/PRD.md)           | Expanded PRD                               |
| [`docs/DASHBOARD-UX.en.md`](./docs/DASHBOARD-UX.en.md) | Dashboard UX spec             |

## License

See [`LICENSE`](./LICENSE).

---

*Assurance Run is a pattern you implement and extend; it is not a substitute
for professional audits or formal verification when your threat model
requires them.*
