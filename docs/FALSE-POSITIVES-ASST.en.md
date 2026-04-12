# False positives filtered — ASST / `deepagentsjs`

**Version 0.1** · Companion to [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Phase 12 · [Bahasa Indonesia](./FALSE-POSITIVES-ASST.id.md)

Automated scanners and grep-style passes often surface **noise**: patterns that look risky out of context but are **acceptable** in this codebase when the rules below apply. This document records **what was filtered** during the ASST-2026-04-12 review so future triage (and future **SARIF merge** lanes) can stay consistent.

**Not a guarantee:** New code can violate these boundaries; treat this as a **triage checklist**, not proof of safety.

---

## 1. Filtered categories (excluded from “findings” in that pass)

| Pattern | Why it is usually a false positive here | Re-check when |
|---------|----------------------------------------|---------------|
| **API key names in docs/examples** | Mentions of identifiers such as `OPENROUTER_API_KEY`, `LANGSMITH_API_KEY` **without values** are documentation and env contract—not live secrets. | The same string appears with a **value** or in a **committed** `.env`. |
| **Test-only credentials** | Placeholder `SECRET_KEY`, dummy tokens, or fixed test vectors in `*.test.*` / fixtures for unit/integration tests. | The same pattern appears in **production** paths or **example** configs intended to be copied verbatim. |
| **`eval` in QuickJS provider** | References to **`eval`** refer to the **QuickJS embedded engine API** inside the sandboxed provider—not unchecked `eval()` on arbitrary host strings. | `eval` appears outside the QuickJS provider boundary or on **user/model** input without sandboxing. |

---

## 2. Triage guidance (for operators)

1. **Confirm context:** file path (test vs lib vs doc), and whether data is **attacker-influenced** at runtime.
2. **Prefer evidence:** manifest-backed tool output and commit SHA over single grep hits.
3. **Merged findings (future):** when a Semgrep/SARIF lane exists ([WHITEPAPER.en.md § 10](../WHITEPAPER.en.md#10-integration-tools-and-execution-surface) § C.2, § E), use **suppressions** or merge rules that reference this list—avoid reopening the same debate on every run.

---

## 3. Related docs

- [DASHBOARD-UX.en.md § 7](./DASHBOARD-UX.en.md#7-llm-and-ai-operator-trust-boundaries) — trust boundaries for model/tool output.
- [STRIDE-ASST.en.md](./STRIDE-ASST.en.md) — threat summary; **Information disclosure** vs doc-only key names.

---

*Internal documentation. Not a security audit or legal advice.*
