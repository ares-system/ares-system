# Product Requirements Document — ASST / Assurance Run

**Document:** PRD  
**Product:** ARES Solana Security Tool (**ASST**) — **Assurance Run** pattern  
**Version:** 1.0  
**Date:** 2026-04-12  
**Status:** Active — aligns with [WHITEPAPER.en.md](../WHITEPAPER.en.md) and repo layout in [README.md](../README.md)

---

## 1. Summary

**Assurance Run** is an orchestration layer for teams shipping **Solana / Anchor** (and related) software. It uses **`deepagentsjs`** (LangGraph-based agents) to run **scoped, layered security checks** and emit **commit-bound evidence** (manifests, merged SARIF, logs)—not a one-off chat score or a replacement for professional audits when the threat model requires them.

**Problem:** Security work is fragmented across static scanners, LLM assistants, CI scripts, and periodic reviews. Outputs rarely attach **reproducible command history**, **tool versions**, and **deterministic linkage** to a **Git SHA**.

**Solution:** A **control-plane agent** plans and delegates to **subagents**, runs **sandboxed** execution where appropriate, optional **human-in-the-loop (HITL)** for irreversible actions, and writes artifacts under a stable prefix (e.g. `assurance/`).

---

## 2. Goals

| ID | Goal | Measurable signal |
|----|------|---------------------|
| G1 | **Reproducible evidence** per meaningful change | Manifest includes commit SHA, tool rows, hashes, exit codes |
| G2 | **Layered checks** without a single generic scanner | Lanes for static/policy, build-verify, merge-report (extensible) |
| G3 | **Least privilege** by default | No signing keys in agent state; RPC read-only; risky tools gated or sandboxed |
| G4 | **CI integration** | Workflows can run lanes and upload artifacts; path filters where useful |
| G5 | **Operator clarity** | Human-readable summary + machine-readable SARIF/JSON merge path |
| G6 | **Optional multi-surface access** | Same capabilities via LangChain tools and/or **MCP stdio server** ([`deepagentsjs/examples/asst-mcp-server`](../deepagentsjs/examples/asst-mcp-server/README.md)) |

---

## 3. Non-goals

- **Formal verification** unless explicitly implemented with stated assumptions and coverage.
- **Autonomous deployment** or **custodial keys** for agents in the default posture.
- **Guarantee** of finding all vulnerabilities; focus is **traceable process and evidence**.
- **Replacing** external audits where policy or customers require them.

---

## 4. Personas

| Persona | Needs |
|---------|--------|
| **Solana engineer** | Fast feedback on PRs; clear failures; minimal friction |
| **Security / CI owner** | Policy-as-code, SARIF merge, supply-chain signals, immutable pins |
| **Leadership / compliance** | Commit-bound bundle, optional digest narrative (see dashboard UX docs) |

---

## 5. Functional requirements

### 5.1 Core orchestration

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Orchestrator can plan a **scoped run** (diff/PR-aware in product vision; MVP may use full repo paths) | P0 |
| F2 | Delegation to **named subagents** (e.g. static-policy, build-verify) via `task` | P0 |
| F3 | **Filesystem / todos / summarization** middleware consistent with `deepagentsjs` | P0 |
| F4 | Optional **HITL** (`interruptOn` + checkpointer) for privileged tools | P1 |

### 5.2 Evidence artifacts

| ID | Requirement | Priority |
|----|-------------|----------|
| F5 | Emit **assurance manifest** (schema versioned; see `examples/assurance-run/schema/`) | P0 |
| F6 | **Semgrep → SARIF** lane when `semgrep` is available; deterministic merge | P1 |
| F7 | **Supply-chain** slice in manifest (e.g. pnpm/cargo signals) where configured | P1 |
| F8 | **Merged SARIF** output path recorded in manifest / operator docs | P1 |

### 5.3 Tools and integrations

| ID | Requirement | Priority |
|----|-------------|----------|
| F9 | **Solana JSON-RPC read** tool (env-configured endpoint) | P0 |
| F10 | **Git diff / status** read-only summary for evidence | P0 |
| F11 | **MCP server** exposing semgrep scan, merge SARIF, git summary, RPC read, manifest CLI spawn | P1 |
| F12 | **OpenRouter** (or configured model) for preset assurance agent smoke paths | P2 |

### 5.4 CLI and apps

| ID | Requirement | Priority |
|----|-------------|----------|
| F13 | **`asst-manifest`** CLI validates/reads manifests (`apps/asst-cli/`) | P2 |
| F14 | **Marketing web** shell (metadata, sitemap) — `apps/web/` | P3 |

---

## 6. Non-functional requirements

| ID | Requirement |
|----|-------------|
| N1 | **Secrets:** no secrets committed; `.env` ignored; examples use `.env.example` |
| N2 | **CI:** primary workflows build/test with path filters where appropriate |
| N3 | **Docs:** English canonical narrative in whitepaper §9–§11; hubs for ARCHITECTURE / TOOLS / REFERENCES |
| N4 | **Sandbox:** production posture assumes `execute` only via approved backends |

---

## 7. Milestones (product engineering)

Aligned with internal planning; adjust per scope.

| Phase | Outcome |
|-------|---------|
| **P0** | Manifest writer + schema; example assurance-run package |
| **P1** | CI PR workflow + isolated smoke; sandboxed execute directionally |
| **P2** | Semgrep + SARIF + merge lane tied to SHA |
| **P3** | Supply-chain merged JSON + manifest summary |
| **P4** | Extended tests / fuzz where applicable |
| **P5** | Optional devnet digest / attestation (policy-dependent) |

---

## 8. Dependencies

- **Runtime:** Node 20+, `pnpm` for `deepagentsjs`
- **Optional:** `semgrep`, `git`, Solana RPC URL, `OPENROUTER_API_KEY` for LLM smoke
- **Upstream:** LangGraph / LangChain ecosystem, `deepagents` package

---

## 9. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Toolchain drift (Anchor/Rust) | Versioned skills, CI matrix, documented pins |
| LLM hallucinated findings | Require tool/log citations; merge lane dedupe |
| Over-privileged agent | Default read-only RPC; HITL; sandbox execution |
| MCP / subprocess abuse | Restrict `cwd`, timeouts, org policy on allowed roots |

---

## 10. Open questions

- Which **default rulesets** and **gate policy** (block vs warn) per customer tier?
- **On-chain digest** scope and legal review for customer-facing claims?
- **Hosted** vs **self-hosted** MCP and agent runtime for enterprise?

---

## 11. References

- [WHITEPAPER.en.md](../WHITEPAPER.en.md) — product narrative, §9 Architecture, §10 Tools, §11 References  
- [ARCHITECTURE.md](../ARCHITECTURE.md) — bilingual architecture hub  
- [TOOLS.md](../TOOLS.md) — tool catalog hub  
- [deepagentsjs/docs/TOOLS-MAP.md](../deepagentsjs/docs/TOOLS-MAP.md) — code ↔ tools map  
- [README.md](../README.md) — repository map---

*PRD is for internal and partner planning. It does not constitute a security audit, certification, or legal commitment.*
