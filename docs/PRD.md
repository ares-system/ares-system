# Product Requirements Document (PRD): ASST

**Title**: ARES Solana Security Tool (ASST) / Assurance Run  
**Version**: 1.0.0  
**Status**: Finalized (Current Implementation)

---

## 1. Executive Summary
ASST is an agentic SecOps platform designed for **Solana** ecosystem projects. It shifts security from "one-off audits" to **Assurance Runs**—repeatable, orchestrated, and evidential workflows that produce commit-bound security manifests.

## 2. Problem Statement
Traditional security audits are slow, manual, and often disconnected from the active development cycle. Developers need a way to perform deep security checks (L1–L6) that are as automated as unit tests but as intelligent as a security researcher.

## 3. Product Vision
To be the definitive "Assurance Lane" for Solana developers, providing an autonomous agent that can understand repository context, execute complex scanning layers, and generate professional-grade evidence for stakeholders.

## 4. Target Audience
- **Solana Lead Developers**: Seeking to gate PRs with automated security manifests.
- **Security Engineers/Auditors**: Running multi-tool scans to identify low-hanging fruit and complex logic flaws.
- **SecOps Teams**: Managing security posture across multiple repositories.

## 5. Functional Requirements

### 5.1. Agentic Orchestration (The Engine)
- **Autonomous Reasoning**: Agents must utilize LangGraph to intelligently select tools based on the repository's technology stack (Anchor, Rust, etc.).
- **GIT Lifecycle Management**: Support for cloning remote repositories and scanning local workspaces.
- **Multi-Model Support**: Support for OpenRouter (Llama 3 70B+) and Google Gemini 2.x models for robust logic and high-token context.

### 5.2. Security Scanning Layers (The 6 Lanes)
| Lane | Name | Description | Tools |
|------|------|-------------|-------|
| **L1** | Program Logic | On-chain instruction safety checks. | Semgrep, Clippy |
| **L2** | Code Hygiene | Coding standards and best practices. | ESLint, Rustfmt |
| **L3** | Chain State | Live program account and upgrade analysis. | RPC Account Analyzer, Upgrade Monitor |
| **L4** | Off-Chain | SDK and Client-side security. | Secret Scanner |
| **L5** | Networking | API and RPC configuration checks. | Env Hygiene Check |
| **L6** | Supply Chain | Dependency vulnerability scanning. | pnpm/cargo audit |

### 5.3. Deliverables & Evidence
- **Assurance Manifests**: JSON artifacts (standardized schema) containing all findings, tool metadata, and commit hashes.
- **Unified Findings UI**: A dashboard that groups findings by repository, severity, and security layer.
- **Automated PDF Reports**: High-fidelity, branded security reports generated as a one-click artifact from the chat thread.

## 6. Technical Requirements

### 6.1. Technology Stack
- **Frontend**: Next.js 14+, Vanilla CSS (Premium Dark/Parchment Aesthetic).
- **Engine**: LangGraph / LangChain + Node.js (TypeScript).
- **Communication**: Shared local filesytem for "Commit-bound" evidence in the `/assurance` directory.
- **PDF Engine**: `jspdf` + `jspdf-autotable`.

### 6.2. Platform Compatibility
- **Cross-Platform**: Full support for Windows (cmd/ps) and Linux (bash), resolving environment pathing issues (`shell: true`).
- **Monorepo Architecture**: Efficiently managed via `pnpm`.

## 7. User Experience (UX) Standards

### 7.1. Agent Console
- **Premium Aesthetic**: Minimalist design using a color palette of "Terracotta", "Coral", and "Deep Charcoal".
- **Real-time Feedback**: "Thinking" states and tool execution indicators.
- **In-Thread Context**: Download links for reports must appear in the chat flow to maintain conversation context.

### 7.2. Reporting
- **Branding**: Reports must feature the ASST brand identity and professional tables.
- **Accessibility**: Support for PDF viewing in-browser and local download.

## 8. Success Metrics
- **Analysis Speed**: End-to-end full assurance run in < 3 minutes.
- **Accuracy**: zero "spawn ENOENT" errors for standard tool chains (pnpm, git, semgrep).
- **Utility**: Successful generation of 100% compliant Assurance Manifests for every scan.

---

*Verified & Committed by ASST Core Team.*
