# Assurance Run — phased development plan (deepagentsjs)

**Purpose:** Internal milestone map from documentation (SDLC / DMAIC, [WHITEPAPER.en.md § 9.3](../WHITEPAPER.en.md#93-sdlc-and-lean-six-sigma-alignment)) to implementation in [`deepagentsjs`](../deepagentsjs/). Not a public commitment; adjust as scope clarifies.

**Product vs. security-doc tracks:** Roadmap items **P0–P5** below are **product/engineering** milestones for Assurance Run and `deepagentsjs`. Phases **4, 7, 9, 10, 12** (CI/CD, LLM trust, OWASP/STRIDE/false-positives matrices) are **supporting security documentation** for operators and reviews — they complement the product but are not substitutes for P2 Semgrep/SARIF, manifests, or on-chain digest work.

| Phase | Focus | Done when |
|-------|--------|-----------|
| **P0** | Manifest writer + `assurance/run-*.json` schema (commit, tool versions, hashes) | Done: [`deepagentsjs/examples/assurance-run`](../deepagentsjs/examples/assurance-run/README.md); extend with real tool rows as lanes land |
| **P1** | CI trigger (PR) + sandboxed `execute` for `cargo` / Anchor | **PR workflow:** [.github/workflows/assurance-run-pr.yml](../.github/workflows/assurance-run-pr.yml) — isolated-shell smoke + manifest; extend job with Anchor/`cargo` in sandbox when ready |
| **P2** | Semgrep + SARIF + merge lane ([WHITEPAPER.en.md § 10](../WHITEPAPER.en.md#10-integration-tools-and-execution-surface) § C.2, § E) | Single merged findings file tied to SHA |
| **P3** | Supply chain: `pnpm audit` + optional `cargo audit` (when `Cargo.lock`); merged JSON + manifest summary | **Done:** [`examples/assurance-run`](../deepagentsjs/examples/assurance-run/README.md) — `supply-chain-merged.json` + `supply_chain` on manifest; `cargo deny` optional follow-up |
| **P4** | Optional fuzz / extended tests | Documented in TOOLS; runs in lane where applicable |
| **P5** | Devnet program or memo **digest** of merged output + wallet attestation | On-chain commitment verifiable against off-chain bundle ([docs/DASHBOARD-UX.en.md § 9](../docs/DASHBOARD-UX.en.md#9-recommended-default-on-chain-digest-payload-evidence-attestation)) |

**Phase 7 — LLM / AI (spot check)** (security report track): **Done** — operator trust boundaries and residual model risk in [docs/DASHBOARD-UX.en.md § 7](../docs/DASHBOARD-UX.en.md#7-llm-and-ai-operator-trust-boundaries) ([Bahasa Indonesia § 7](../docs/DASHBOARD-UX.id.md#7-llm-dan-ai-batas-kepercayaan-operator)); complements `deepagents` middleware (HITL, sandboxes) and [`.superstack/security-reports`](../.superstack/security-reports/ASST-2026-04-12.md) Phase 7.

**Phase 4 — CI/CD** (security / delivery track; see also `.superstack/security-reports` Phase 4): **Done** — [.github/workflows/deepagentsjs-ci.yml](../.github/workflows/deepagentsjs-ci.yml) (`pnpm build`, `typecheck`, `test:unit` on PR/push to `main` with path filters); [assurance-run-pr.yml](../.github/workflows/assurance-run-pr.yml) uses **SHA-pinned** actions (including `upload-artifact`), **`contents: read` + `actions: write`** where artifact upload needs it, **no secrets** in YAML. Integration tests (`pnpm test:int`) remain optional/local when providers need keys.

**Phase 9 — OWASP Top 10:2025 (partial)** (security report track): **Done** — full-category matrix with official links: [docs/OWASP-TOP10-2025-ASST.en.md](../docs/OWASP-TOP10-2025-ASST.en.md) · [docs/OWASP-TOP10-2025-ASST.id.md](../docs/OWASP-TOP10-2025-ASST.id.md); summarized in [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Phase 9.

**Phase 10 — STRIDE (summary)** (security report track): **Done** — [docs/STRIDE-ASST.en.md](../docs/STRIDE-ASST.en.md) · [docs/STRIDE-ASST.id.md](../docs/STRIDE-ASST.id.md); component table retained in [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Phase 10.

**Phase 12 — False positives filtered** (security report track): **Done** — [docs/FALSE-POSITIVES-ASST.en.md](../docs/FALSE-POSITIVES-ASST.en.md) · [docs/FALSE-POSITIVES-ASST.id.md](../docs/FALSE-POSITIVES-ASST.id.md); bullets retained in [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Phase 12.

**Alignment:** P0–P2 map to **Measure** and **Improve**; P3–P4 deepen evidence; P5 supports **Control** and stakeholder accountability. UI surfaces (web, CLI first): [docs/DASHBOARD-UX.en.md § 10](../docs/DASHBOARD-UX.en.md#10-personas--surface-phased-delivery).

## Assurance Run ↔ `deepagentsjs` (code map)

This ties [WHITEPAPER.en.md § 9](../WHITEPAPER.en.md#9-architecture) concepts to packages under [`deepagentsjs/`](../deepagentsjs/).

| ASST / doc concept | `deepagentsjs` location |
|--------------------|-------------------------|
| Orchestrator (“deep agent” control plane) | [`libs/deepagents`](../deepagentsjs/libs/deepagents/) — `createDeepAgent`, graph composition, middleware |
| Subagents, delegated lanes | Same — `createSubAgentMiddleware`, async subagent patterns; see `examples/hierarchical/`, `examples/async-subagent-server/` |
| Skills / policy-as-code | [`createSkillsMiddleware`](../deepagentsjs/libs/deepagents/src/middleware/) — SKILL.md-style rules |
| Sandboxed `execute`, backends | [`libs/providers/*`](../deepagentsjs/libs/providers/) — node-vfs, daytona, modal, quickjs, deno; `examples/sandbox/`, `examples/backends/` |
| Evidence artifacts (`assurance/`, manifests) | **[`examples/assurance-run`](../deepagentsjs/examples/assurance-run/)** — P0 manifest writer + Zod/JSON Schema v1; CLI [`write-run-manifest.ts`](../deepagentsjs/examples/assurance-run/write-run-manifest.ts) |

**Chat models (ASST-facing):** use LangChain [**`ChatOpenRouter`**](https://docs.langchain.com/oss/javascript/integrations/chat/openrouter) from **`@langchain/openrouter`** (declared at monorepo root for ASST work). Set **`OPENROUTER_API_KEY`** in `.env` (see `deepagentsjs/.env.example`). Optional **LangSmith** tracing: `LANGSMITH_API_KEY` / `LANGSMITH_TRACING`.

**P0 code anchor:** **`deepagentsjs/examples/assurance-run/`** — manifest v1 + writer CLI; shared library extraction to a workspace package is optional when CLI/UI need the same module.

---

*Internal planning. Not a security audit or legal advice.*
