# @asst/web

Next.js 15 app that serves:

1. The public **marketing site** (home page, feature pages).
2. A **dashboard** showing assurance-run evidence and findings.
3. An **API surface** (`/api/*`) that talks to `@ares/engine`.

## Public-surface security model

The web app is intended to be reachable by untrusted users (with future wallet
auth + paid usage). Every API route therefore uses:

```ts
import { createPublicOrchestrator } from "@/lib/engine-factory";
```

`createPublicOrchestrator()` forces `ASST_ALLOW_WRITE=0` and installs a
default-deny permission hook. Mutating tools (`write_file`,
`run_terminal_cmd`) will refuse every call from the web surface unless you
explicitly opt in with `ASST_WEB_ALLOW_WRITE=1` on the server.

Do **not** instantiate `new Orchestrator()` directly from a web route.

## Layout

```
app/
├── layout.tsx               Root layout
├── page.tsx                 Landing page
├── dashboard/               Security dashboard pages
├── components/              Presentational components
└── api/
    ├── chat/route.ts        POST /api/chat — orchestrator.chat(prompt)
    ├── scan/route.ts        POST /api/scan — orchestrator.runFullScan()
    ├── agents/route.ts      GET  /api/agents — sub-agent metadata
    ├── findings/route.ts    GET  /api/findings — aggregated SARIF + scan
    ├── targets/route.ts     GET  /api/targets — persisted scan targets
    └── console/stream/route.ts  SSE stream of recent agent activity
lib/
├── engine-factory.ts        createPublicOrchestrator() — THE only way
│                            API routes should build an Orchestrator.
└── data.ts                  Loaders for posture data from disk artifacts.
```

## Running locally

```bash
pnpm --filter @asst/web dev       # http://localhost:3000
pnpm --filter @asst/web build     # production bundle
pnpm --filter @asst/web start     # run compiled build
```

Environment (read from `.env.local` at repo root):

| Variable                  | Required | Purpose                                          |
| ------------------------- | -------- | ------------------------------------------------ |
| `GOOGLE_API_KEY`          | yes*     | default Gemini orchestrator model                |
| `OPENROUTER_API_KEY`      | when sub-agents use OpenRouter                   |
| `ASST_ORCHESTRATOR_MODEL` | no       | override default model, e.g. `ollama:llama3.1`   |
| `ASST_WEB_ALLOW_WRITE`    | no       | set to `1` ONLY on trusted private deployments   |
| `SOLANA_RPC_URL`          | no       | override default `https://api.devnet.solana.com` |

\* unless `ASST_ORCHESTRATOR_MODEL` points at a non-Google provider.

## Future: wallet-gated usage

The product direction is: a few free chats per wallet, then connect-and-pay.
The auth/payment surface will live in `app/api/auth/*` and a new
`lib/billing.ts`. Keep the engine agnostic — don't leak billing logic into
`@ares/engine`.
