# STRIDE — ASST / `deepagentsjs` (summary)

**Version 0.1** · Companion to [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Phase 10 · [Bahasa Indonesia](./STRIDE-ASST.id.md)

[STRIDE](https://learn.microsoft.com/en-us/previous-versions/commerce-server/ee823878(v=cs.20)) (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege) is a **threat-modeling mnemonic**. This page gives a **partial** summary for the Assurance Run workspace and **`deepagentsjs`**—not a full data-flow threat model.

---

## 1. By threat type (partial)

| Threat | What it means (short) | Notes for this workspace |
|--------|------------------------|----------------------------|
| **Spoofing** | Misuse of identity | API keys and provider auth belong in **env / secret stores** (see `.env.example`); model-generated content must not be treated as trusted identity—[DASHBOARD-UX.en.md § 7](./DASHBOARD-UX.en.md#7-llm-and-ai-operator-trust-boundaries). |
| **Tampering** | Unauthorized modification | **Dependencies:** supply-chain lane ([P3](../.superstack/development-plan.md)), overrides, audits. **CI:** SHA-pinned third-party actions, frozen lockfile installs. **Artifacts:** commit-bound assurance manifests with hashes. |
| **Repudiation** | Denying an action | **Partial:** manifests record tool versions and commit SHA; optional **on-chain digest** and LangSmith traces improve accountability—see [DASHBOARD-UX.en.md § 9](./DASHBOARD-UX.en.md#9-recommended-default-on-chain-digest-payload-evidence-attestation). Full non-repudiation is an **organizational** process, not proven by this repo alone. |
| **Information disclosure** | Exposed secrets or data | `.env` untracked; no live secrets observed in routine scans (report). **Residual:** SSRF / metadata-class issues from transitive **axios** in Daytona SDK path ([FINDING-001](../.superstack/security-reports/ASST-2026-04-12.md#high-finding-001-transitive-vulnerable-axios-via-daytonaio-sdk)); mitigate via upgrade/override. |
| **Denial of service** | Availability / resource abuse | **Not** exhaustively reviewed (agent loops, provider quotas, sandbox CPU/memory). Operational limits and monitoring are deployment responsibilities. |
| **Elevation of privilege** | Extra capability without authorization | **Design:** sandboxes, HITL middleware, skills policy ([WHITEPAPER.en.md § 9](../WHITEPAPER.en.md#9-architecture)). Deployments must enforce **least privilege** on tools and external accounts. |

---

## 2. By component (spot-check table)

| Component | Primary STRIDE themes | Mitigation in tree |
|-----------|----------------------|-------------------|
| **Daytona provider** (`libs/providers/daytona`) | **Tampering** / **Information disclosure** (SSRF-class issues via vulnerable **axios** transitively) | Upgrade `@daytonaio/sdk` or **pnpm override** `axios` (see FINDING-001, [OWASP mapping](./OWASP-TOP10-2025-ASST.en.md)). |
| **LangSmith client** (transitive) | **Tampering** / **Integrity** (prototype pollution class—A08-style) | Bump / override **langsmith** (FINDING-002). |
| **GitHub Actions (CI)** | **Tampering** of pipeline; misconfiguration | SHA-pinned actions, scoped permissions, secrets via **`secrets.*`** only; see [Phase 4](../.superstack/security-reports/ASST-2026-04-12.md#phase-4--cicd) in the report. |

---

## 3. Relationship to OWASP

Supply-chain and integrity topics overlap **OWASP A03 / A08**; injection and trust-boundary topics overlap **A05**—see [OWASP-TOP10-2025-ASST.en.md](./OWASP-TOP10-2025-ASST.en.md).

**Scanner noise:** [FALSE-POSITIVES-ASST.en.md](./FALSE-POSITIVES-ASST.en.md) lists patterns often filtered when triaging static scans (e.g. doc-only key names vs real secrets).

---

*Internal documentation. Not a security audit or legal advice.*
