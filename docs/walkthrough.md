# Walkthrough: End-to-End Security Assurance

This document provides a guided walkthrough of the **ARES Solana Security Tool (ASST)** project, focusing on the core user journey from repository analysis to finalized security reporting.

## 1. Initial Setup & Initialization

ASST is built as a monorepo. To get started, you initialize the environment from the root:

```bash
pnpm install
# Environment variables must be set in .env.local
# Required: OPENROUTER_API_KEY, GOOGLE_API_KEY
```

## 2. The Agentic Security Console

The heart of the product is the **Agent Console** (`/dashboard/console`). Here, you interact with a SecOps Agentic specialist designed for Solana.

### Key Capabilities:
- **Git Integration**: Provide a GitHub URL, and the agent uses `git_clone_repo` to pull the context locally.
- **Multimodal Analysis**: The agent selects from 11+ specialized tools based on your prompts.
- **Context Preservation**: The agent maintains the repository path and findings history throughout the session.

## 3. The Security Assurance Lane (DMAIC Flow)

When you trigger a "Full Assurance Run," the system executes an orchestrated sequence:

1. **Layer 6 (Supply Chain)**: `pnpm audit` analysis via `write_assurance_manifest`.
2. **Layer 1 (Code Logic)**: Static analysis (Semgrep/Clippy logic) and secret scanning.
3. **Layer 3 (Chain State)**: RPC-based account analysis and upgrade monitor checks.
4. **Aggregation**: `merge_findings` combines results into a unified JSON manifest.

## 4. Automated Reporting & Interactive Dashboard

### Unified Findings
The **Findings Page** (`/dashboard/findings`) provides a high-level view of all identified vulnerabilities, now grouped by repository for multi-project management.

### Finalized PDF Reports
Once an analysis is 100% complete, the agent automatically:
1. Generates a **Premium Branded PDF Report**.
2. Displays an **interactive button** directly in the chat thread: `View Finalized [Repo] Report (PDF)`.

## 5. Technical Resilience (Recent Enhancements)

- **Windows Compatibility**: Resolved `ENOENT` errors for `pnpm` and `cmd.exe` by ensuring robust environment variable preservation and shell-native execution.
- **Node-Native PDF Engine**: Implemented `jspdf-autotable` with a Node-compatible lifecycle to ensure zero-dependency, reliable document generation on the server side.
- **Git Hygiene**: Next.js API routes now correctly handle clean Git environments, preventing conflicts between the web server and the agentic CLI.

---

*For technical architecture details, see [ARCHITECTURE.md](../ARCHITECTURE.md). For product requirements, see [PRD.md](./PRD.md).*
