# Assurance Run — Dashboard UX, palette, and evidence attestation

**Version 0.1** — Companion to [WHITEPAPER.en.md § 9.3.4](../WHITEPAPER.en.md#34-ui-multi-surface-clients-and-digest-payload) · [Bahasa Indonesia](./DASHBOARD-UX.id.md)

This document specifies **operator / stakeholder** UX principles for a future Assurance Run **dashboard** (and related surfaces). It does not replace raw `assurance/` files or professional audits.

---

## 1. Actionable dashboard

Every primary view should answer: **what should I do next?**

| Pattern | Intent |
|---------|--------|
| Primary actions | **Run assurance** · **View latest run** · **Open findings** |
| Failed gates | One dominant CTA (e.g. **View SARIF**, **Request waiver**) |
| Avoid | Vanity charts with no next step |

---

## 2. Fast, practical navigation

| Pattern | Intent |
|---------|--------|
| Global nav | **Runs** · **Evidence** · **Policy** · **Settings** |
| Deep links | `/runs/:sha`, `/findings` |
| Search / command palette | Jump by commit SHA or PR id |
| Target | ≤3 interactions to latest run, commit SHA, and merged severity |

---

## 3. Clarity and transparency

Trust through **inspectability**, not marketing.

| Always show | Notes |
|-------------|--------|
| Git SHA and ref | Branch or tag when available |
| Tool names + versions | As recorded in manifest |
| Exit codes | Per step |
| Timestamps | UTC + local |
| Raw bundle | Link to `assurance/run-*.json` |

Do **not** hide failures behind an all-green summary.

---

## 4. Field-ready use

| Pattern | Intent |
|---------|--------|
| Loading | Skeleton states for async runs |
| Offline | Cache last successful run summary where safe |
| Touch | Minimum ~44×44 px targets |
| Motion | Respect `prefers-reduced-motion` |
| Power users | Keyboard shortcuts for common jumps |

---

## 5. Invisible automation

| Pattern | Intent |
|---------|--------|
| CI triggers | Show **queued / running / failed** clearly |
| Notifications | One-line summary (optional Slack/webhook) |
| Failures | Always visible in-app, not only in chat |

---

## 6. Success factors (IDF-style)

| Factor | Dashboard behavior |
|--------|----------------------|
| **Useful** | Supports the decision: *safe to merge?* Export for audit pack. |
| **Credible** | Data from manifest and tools—not LLM-only scores. |
| **Desirable** | Calm, restrained UI; no gamification of security. |
| **Findable** | Runs, findings, waivers, digest/attestation in primary nav. |

**Accessibility:** semantic regions, focus order, live region for run completion (WCAG 2.1 AA target).

---

## 7. LLM and AI (operator trust boundaries)

**Purpose:** record a **spot-check** of how model-assisted flows relate to risk—not a substitute for threat modeling or red teaming.

| Topic | Guidance |
|-------|----------|
| **Tools, shell, filesystem, network** | Treat **model-produced strings as untrusted** until validated. Prefer **policy middleware**, **sandboxed `execute` backends**, and **human-in-the-loop** for destructive or high–blast-radius actions. |
| **QuickJS provider** | **`eval`** refers to the **QuickJS engine API** inside the provider’s isolated runtime—not approval to pipe arbitrary content into host-level `eval()` or shell. |
| **Dashboards** | Surface **manifest-backed** facts (tool names, versions, exit codes, commit SHA). Do not present **LLM-generated** “security scores” as primary evidence without labeling them as non-deterministic summaries. |
| **Residual risk** | Prompt injection, tool abuse, and confused-deputy flows depend on **deployment** controls (allowlists, monitoring, org policy). |

**Non-goals:** This does not certify model outputs; it sets **UX and integration expectations** for operators and builders.

---

## 8. Color palette — CSS variables

Semantic roles (implement with `:root` in a future app).

| Token | Hex | Role |
|-------|-----|------|
| `--surface` | `#eeeeee` | Page background |
| `--surface-raised` | `#f2f2f3` | Cards / panels |
| `--border-subtle` | `#8ca4ac` | Dividers |
| `--text-muted` / `--accent-soft` | `#7d9cb7` | Secondary labels, metadata |
| `--primary` | `#217eaa` | Primary actions, links |
| `--text-primary` | `#4d4847` | Body text |
| `--danger` | `#df0606` | Failed gates, critical findings (pair with icon/text) |
| `--danger-dark` | `#7a0809` | Hover / emphasis on danger |
| `--ink` | `#160404` | Headings |

Cool blues support **credibility**; neutrals keep focus on **data**; reserve **red** for failure so it stays salient. Verify **4.5:1** contrast for body text.

---

## 9. Recommended default: on-chain digest payload (evidence attestation)

**Purpose:** bind a **wallet-signed** transaction to a **specific assurance run** without claiming the CI runner is trust-free. The chain stores a **commitment**; verifiers recompute the hash from published artifacts.

**Recommended minimum fields** (version the schema, e.g. `assurance_digest_v1`):

1. **Hash of merged JSON** — canonical serialization of the single merged findings/supply-chain output (e.g. solsec-style bundle).
2. **`git` commit SHA** — and branch/ref or tag name.
3. **Tool manifest** — names and versions for Semgrep, `cargo audit`, `cargo deny`, etc.
4. **Optional: lockfile digest** — e.g. SHA-256 of `Cargo.lock` and/or npm/pnpm lockfile for defense-in-depth.

**Off-chain:** full JSON, logs, and signing key policy remain **out of band**; the digest is a **pointer**, not the evidence itself.

**Non-goals:** This does not prove the runner was honest unless runner identity and artifact URLs are also committed and verified—document limitations for stakeholders.

---

## 10. Personas × surface (phased delivery)

| Persona | Primary surface | Notes |
|---------|-----------------|--------|
| Developer | Web (React) | PR checks, drill-down to SARIF |
| Sec / release owner | Web + optional **CLI** | Approve waivers, export bundle |
| CI / automation | **CLI** | Same manifest schema as UI; no browser |
| Field operator | Web (mobile-friendly) | Large touch targets, stable on flaky networks |
| Desktop power user | **Tauri** (optional) | Wrap web or embed native views; same API |
| Quick terminal glance | **TUI** (optional) | Read-only status; later phase |

**Suggested MVP order:** **Web (React)** + **CLI** parity → **Tauri** / **TUI** as enhancements.

---

*Internal documentation. Not a security audit or legal advice.*
