# LangGraph local dev (ASST)

Minimal [LangGraph.js](https://docs.langchain.com/oss/javascript/langgraph/overview) setup for **local testing and development**: in-memory checkpointing ([`MemorySaver`](https://docs.langchain.com/oss/javascript/langgraph/persistence)), optional **interrupt / HITL** sample, **Vitest** patterns, and the **Agent Server** via `langgraphjs dev` (the JS CLI from `@langchain/langgraph-cli` installs the binary as `langgraphjs`, not `langgraph`).

Official guides:

- [Install LangGraph](https://docs.langchain.com/oss/javascript/langgraph/install)
- [Run a local server](https://docs.langchain.com/oss/javascript/langgraph/local-server) (`langgraphjs dev`, Studio URL)
- [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- [Test](https://docs.langchain.com/oss/javascript/langgraph/test)

## Prerequisites

- Node 20+
- A [LangSmith](https://smith.langchain.com/) API key for **`langgraphjs dev`** (Agent Server)

## Install

From repo root:

```bash
cd deepagentsjs/examples/langgraph-local
pnpm install
cp .env.example .env
# set LANGSMITH_API_KEY in .env
```

## Agent Server + Studio (recommended for interactive dev)

```bash
pnpm dev
```

CLI output includes:

- API: `http://127.0.0.1:2024`
- Studio: `https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`

Use assistant ids **`agent`** (echo) or **`agent_hitl`** (approval interrupt) as defined in `langgraph.json`.

Safari: use `pnpm dev:tunnel` if localhost fails ([docs](https://docs.langchain.com/oss/javascript/langgraph/local-server)).

## Run graph without the server

No LangSmith key required:

```bash
pnpm exec tsx src/run-local.ts "ping"
```

## Tests

```bash
pnpm test
```

Follows the [unit-test patterns](https://docs.langchain.com/oss/javascript/langgraph/test) (fresh `MemorySaver` per test where appropriate).

## Layout

| File | Purpose |
|------|---------|
| `src/graph.ts` | `agent` — `MessagesValue` + `MemorySaver` |
| `src/graph_hitl.ts` | `agent_hitl` — `interrupt()` + resume (`Command` helper exported) |
| `langgraph.json` | Graph exports for LangGraph CLI |

Production deployments should replace `MemorySaver` with a durable checkpointer (e.g. Postgres); see the [persistence skill](https://docs.langchain.com/oss/javascript/langgraph/persistence) and [LangGraph Platform](https://docs.langchain.com/langgraph-platform/deployment-options).
