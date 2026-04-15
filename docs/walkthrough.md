# ASST CLI Transformation Walkthrough

## 1. Overview
The ASST Solana Security Tool has been modernized from a Next.js web application into a CLI-native Agentic Tool. This change enables developers to perform high-speed security audits directly from their local workspace without requiring a browser.

## 2. Key Components Created

### 2.1 CLI Entry Point (`apps/asst-cli/src/asst.ts`)
- Implemented using **Commander.js**.
- Commands:
  - `asst init`: Environment configuration.
  - `asst scan`: Sequential L1-L6 security assurance.
  - `asst chat`: Persistent REPL for codebase interaction.
  - `asst index`: Search indexing for the repository.

### 2.2 Agentic Engine (`apps/asst-cli/src/engine/agent.ts`)
- Orchestrates LangGraph logic for the terminal.
- Integrates 11+ security tools from `deepagentsjs`.
- Provides stateful chat sessions with SQLite persistence.

### 2.3 Integrated Security Tools
- **Filesystem Tools:** `read_file`, `write_file`, and `run_terminal_cmd`.
- **Solana Tools:** RPC analysis, Git Diff, Account Snapshot, etc.

## 3. How to Use

### Installation
```bash
# From the monorepo root
pnpm install
cd apps/asst-cli
pnpm build
npm link # To use 'asst' command globally
```

### Running a Scan
Navigate to your Solana/Anchor project and run:
```bash
asst scan .
```
1. ASST will perform sequential checks (L1-L6).
2. A summary report of vulnerabilities will be printed.
3. You will be asked if you want the agent to propose and apply fixes.

### Interactive Chat
Start a persistent session to ask specific questions about your code:
```bash
asst chat
```
The agent maintains history in `.asst/asst.db`, allowing for complex, multi-turn debugging.

## 4. Safety First
All destructive actions (`write_file`, `run_terminal_cmd`) are gated by a **Safe Mode** confirmation. The agent will describe exactly what it want to do and ask for your approval before proceeding.

---
*Created by ASST Agent on 2026-04-15*
