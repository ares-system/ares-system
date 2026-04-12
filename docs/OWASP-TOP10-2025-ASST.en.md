# OWASP Top 10:2025 — ASST / `deepagentsjs` (partial)

**Version 0.1** · Companion to [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Phase 9 · [Bahasa Indonesia](./OWASP-TOP10-2025-ASST.id.md)

This is a **partial, non-exhaustive** mapping of [OWASP Top 10:2025](https://owasp.org/Top10/2025/) categories to the **Assurance Run** documentation and **`deepagentsjs`** tree in this workspace. It is **not** a certification, penetration test, or complete control matrix. Gaps are expected; treat rows as **spot-check notes** for operators and developers.

| ID | Category | Posture in this workspace (partial) |
|----|----------|--------------------------------------|
| **A01:2025** — [Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) | **Not** systematically reviewed here. Production surfaces must enforce **authorization** on APIs, tools, and agent actions (deny-by-default, ownership checks). |
| **A02:2025** — [Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/) | **CI/CD:** SHA-pinned actions, scoped `GITHUB_TOKEN` permissions, no secrets in workflow YAML ([Phase 4](../.superstack/security-reports/ASST-2026-04-12.md#phase-4--cicd)). **Examples:** default `POSTGRES_PASSWORD` in `docker-compose` is **dev-only**—not a production baseline. |
| **A03:2025** — [Software Supply Chain Failures](https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/) | **P3:** `pnpm audit` / optional `cargo audit`, merged `supply-chain-merged.json`, manifest `supply_chain` summary; **pnpm overrides** for known transitive issues ([Phase 3](../.superstack/security-reports/ASST-2026-04-12.md#phase-3--dependency-supply-chain), FINDING-001/002). Re-run after dependency changes. |
| **A04:2025** — [Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) | **Not** audited in this pass. Use TLS for remote APIs; manage keys via env/secret stores—see deployment guidance, not library guarantees. |
| **A05:2025** — [Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) | **Web:** No `dangerouslySetInnerHTML` in `libs/` (spot check). **QuickJS provider:** `eval` is the **sandboxed engine API**, not host arbitrary eval. **LLM outputs:** treat as untrusted before shell/FS/network—[DASHBOARD-UX.en.md § 7](./DASHBOARD-UX.en.md#7-llm-and-ai-operator-trust-boundaries). |
| **A06:2025** — [Insecure Design](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/) | **Architecture** emphasizes measurable evidence, sandboxes, HITL patterns ([WHITEPAPER.en.md § 9](../WHITEPAPER.en.md#9-architecture)); design review of **your** product layer remains required. |
| **A07:2025** — [Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/) | **Not** in scope for this document set. Integrations (OpenRouter, LangSmith, wallets) must follow each provider’s auth best practices. |
| **A08:2025** — [Software or Data Integrity Failures](https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/) | **Supply chain:** advisories and overrides (A03). **Manifests:** commit-bound `assurance/run-*.json` with hashes. **Transitive libs:** e.g. `langsmith` advisory addressed via version bump/override (FINDING-002). |
| **A09:2025** — [Security Logging and Alerting Failures](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/) | **CI** and optional **LangSmith** tracing—no claim of centralized security monitoring; operators should wire org-standard logging/alerting for production. |
| **A10:2025** — [Mishandling of Exceptional Conditions](https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/) | **Not** exhaustively reviewed (error paths, resource exhaustion, fail-open behavior). Favor explicit failures in deployment policies and tests. |

**Suggested next steps (outside this doc):** Semgrep/SARIF lane ([WHITEPAPER.en.md § 10](../WHITEPAPER.en.md#10-integration-tools-and-execution-surface)), threat modeling for deployed agents, and periodic dependency and CI policy review.

**See also:** [STRIDE-ASST.en.md](./STRIDE-ASST.en.md) (STRIDE threat summary); [FALSE-POSITIVES-ASST.en.md](./FALSE-POSITIVES-ASST.en.md) (filtered scanner patterns).

---

*Internal documentation. Not a security audit or legal advice.*
