# ASST — ARES Solana Security Tool

**ARES Solana Security Tool** (**ASST**) — Solana security tooling delivered as **Assurance Run** in this repository.

This repository is a **product workspace** for **Assurance Run**: orchestrated security workflows for teams shipping **Solana** (and related) software—not a standalone “audit deliverable.”

## What lives here

| Layer | Role |
|--------|------|
| **[`deepagentsjs/`](./deepagentsjs/)** | The **engine**: controllable agents (LangGraph), sandbox backends (`execute`), skills/middleware, and examples. Here it backs **Solana-oriented security tooling**: scoped runs, policy-as-code, and evidence you can ship or integrate—not only one-off scans. See **[`deepagentsjs/README.md`](./deepagentsjs/README.md)** for package-level API docs. |
| **[`apps/asst-cli/`](./apps/asst-cli/)** | Small **CLI** (`asst-manifest`) to read and validate **assurance manifests** from the terminal (build after `pnpm install` / `npm run build` in that package). |
| **[`apps/web/`](./apps/web/)** | **Next.js** marketing/SEO shell: metadata, `sitemap.xml`, `robots.txt`, JSON-LD. See [`apps/web/README.md`](./apps/web/README.md). |
| **[`scripts/`](./scripts/)** | Automation (e.g. **Colosseum Copilot** competitor scan — needs `COLOSSEUM_COPILOT_PAT`; see [`COMPETITORS.md`](./COMPETITORS.md)). |
| **[`analysis/positioning/`](./analysis/positioning/)** | Optional **illustrative** positioning charts (CSV + plots; not API metrics). |
| **[`analysis/revenue-forecast/`](./analysis/revenue-forecast/)** | Optional **illustrative** synthetic monthly MRR/usage time-series forecasts (SARIMA/ETS baselines; methodology in [`analysis/revenue-forecast/README.md`](./analysis/revenue-forecast/README.md)). |
| **Docs at repo root** | Architecture, tool catalog, dashboard UX, whitepaper—**product and integration** context. **PRD:** [`docs/PRD.md`](./docs/PRD.md). |
| **`.superstack/`** | Internal planning and optional security notes—**supporting material**, not the product itself. |

## Product story (short)

**Assurance Run** uses **`deepagentsjs`** to run **layered checks** (static analysis, supply chain, sandboxed commands, optional HITL) and produce **commit-bound evidence**: **assurance manifests**, **merged SARIF** (and related artifacts), and flows you can gate in CI—not a single score or generic chat-only audit. See **[WHITEPAPER.en.md](./WHITEPAPER.en.md)** · **[WHITEPAPER.id.md](./WHITEPAPER.id.md)**.

## Where to code

- **Agents, tools, providers:** `deepagentsjs/libs/deepagents/`, `deepagentsjs/libs/providers/*`
- **Evidence / manifests (Assurance Run lane):** `deepagentsjs/examples/assurance-run/` (schema under `examples/assurance-run/schema/`)
- **Tool & integration map:** [WHITEPAPER.en.md § 10](./WHITEPAPER.en.md#10-integration-tools-and-execution-surface) · [TOOLS.md](./TOOLS.md) · [TOOLS.id.md](./TOOLS.id.md)
- **Competitive landscape (internal):** [COMPETITORS.md](./COMPETITORS.md)

## Quick start (monorepo)

```bash
cd deepagentsjs
pnpm install
pnpm build
pnpm test:unit
```

Copy `deepagentsjs/.env.example` to `deepagentsjs/.env` and set keys your flows need (e.g. `OPENROUTER_API_KEY` for the Assurance Run preset). In GitHub Actions, the optional OpenRouter smoke step uses the repository secret **`OPENROUTER_API_KEY`** (see `.github/workflows/assurance-run-pr.yml`).

**Read manifests via CLI (optional):**

```bash
cd apps/asst-cli && npm install && npm run build
# Reads ./assurance/run-*.json under cwd (or pass a repo root that contains assurance/)
node dist/read-manifest.js
```

**Public SEO site (optional):**

```bash
cd apps/web && cp .env.example .env.local && npm install && npm run dev
```

---

*Assurance Run is a pattern you implement and extend; it is not a substitute for professional audits or formal verification when your threat model requires them.*
