# @ares/engine

The multi-agent security engine that powers the CLI (`@asst/cli`), the web
dashboard (`@asst/web`), and the MCP server (`@asst/mcp-server`).

Everything security-related — LLM orchestration, sub-agent definitions, skill
loading, persistent state, and the assurance tool catalog — is exported from
this single package.

## Layout

```
src/
├── index.ts                  Public API barrel. If it's not exported here
│                             you shouldn't be importing it from outside
│                             the package.
├── orchestrator.ts           Top-level Orchestrator class. Routes a chat
│                             prompt to one of the sub-agents via JSON, or
│                             runs the deterministic 6-agent full scan.
├── sub-agents.ts             SUB_AGENT_CONFIGS + SubAgent runtime class.
│                             Each sub-agent specifies model, fallback
│                             models, skills, tools, and system prompt.
│
├── config/
│   └── model-factory.ts      createModel("<provider>:<model>") — routes
│                             to Google, OpenRouter, OpenAI-compatible, or
│                             Ollama. Lets users run local models.
│
├── persistence/
│   └── sqlite.ts             SQLite-backed chat history, code index, scan
│                             results, watches. Auto-migrates legacy lowdb
│                             (.asst/asst.json) on first init.
│
├── skills/
│   ├── loader.ts             loadSkills / listInstalledSkills. Reads
│   │                         SKILL.md files from .agents/skills/ (canonical)
│   │                         or .cursor/skills/ (fallback).
│   ├── frontmatter.ts        parseSkillMarkdown — YAML-fence parser for
│   │                         SKILL.md (name + description + body).
│   ├── tfidf.ts              Zero-dep TF-IDF tokenizer + indexer + ranker.
│   └── retrieval.ts          buildSkillCatalog / rankSkillsForQuery /
│                             loadSkillsForTask. On-disk cache at
│                             .asst/skills-index.json, mtime-invalidated.
│
├── findings/                 Canonical Zod schema for structured findings.
│   ├── schema.ts             Finding / FindingSummary / ToolResult Zod
│   │                         schemas + Severity / Confidence / Kind enums.
│   ├── helpers.ts            makeFinding / makeToolResult / summarize /
│   │                         stringifyToolResult / parseToolResult /
│   │                         toHumanSummary / exceedsThreshold.
│   └── sarif.ts              Finding[] ↔ SARIF 2.1.0 bridge.
│
├── tools/
│   ├── index.ts              Tool exports + legacy globalThis bridge for
│   │                         backward compat.
│   ├── readonly.ts           Always-safe tools (readFileTool).
│   └── mutating.ts           createMutatingTools({ askPermission, sandbox })
│                             produces writeFileTool + runTerminalCmdTool
│                             gated by user approval AND ASST_ALLOW_WRITE.
│                             All host effects go through a SandboxBackend.
│
├── sandbox/                  Pluggable execution surface — see sandbox/README.md.
│   ├── types.ts              SandboxBackend interface.
│   ├── host-shell.ts         Default — execa on the host (cross-platform).
│   ├── docker.ts             One-shot container backend + dockerAvailable().
│   ├── deepagents-adapter.ts Wraps any deepagents BaseSandbox as SandboxBackend.
│   └── factory.ts            createSandbox() — ASST_SANDBOX_BACKEND=host|docker.
│
└── assurance-tools/          LangChain tools the sub-agents use.
    ├── index.ts              Barrel — grouped by concern.
    ├── anchor-source-scanner.ts    Rust static analysis (heuristic, low
    │                               confidence on regex-only hits).
    ├── secret-scanner.ts           Git-history secret sweep + entropy.
    ├── env-hygiene-check.ts        .env.example and .gitignore hygiene.
    ├── token-concentration.ts      SPL HHI / Gini.
    ├── solana-rpc-read.ts          Read-only JSON-RPC calls.
    ├── program-account-analyzer.ts Program → owned-account summary.
    ├── program-upgrade-monitor.ts  BPF loader + ProgramData checks.
    ├── cpi-graph-mapper.ts         Anchor IDL walker → instruction map.
    ├── account-state-snapshot.ts   Writes raw account state to disk.
    ├── git-clone-repo.ts           Git clone helper for external targets.
    ├── git-diff-summary.ts         `git diff --stat` reader.
    ├── merge-sarif.ts              Pure SARIF log merger.
    ├── merge-findings-tool.ts      Tool wrapper around merge-sarif.
    ├── run-semgrep.ts              Spawns semgrep CLI, returns SARIF path.
    ├── write-assurance-manifest-tool.ts
    ├── unified-posture-report.ts   Layered posture score.
    └── generate-pdf-report-tool.ts jsPDF renderer.
```

## Public API cheat sheet

```ts
import {
  Orchestrator,
  SUB_AGENT_CONFIGS,
  createModel,
  parseModelId,
  DEFAULT_ORCHESTRATOR_MODEL,
  listInstalledSkills,
  loadSkills,

  // Skill retrieval (TF-IDF)
  buildSkillCatalog,
  rankSkillsForQuery,
  loadSkillsForTask,
  renderCatalogSummary,

  createMutatingTools,
  readFileTool,

  // Sandbox execution surface
  createSandbox,
  createHostSandbox,
  HostShellSandbox,
  DockerSandbox,
  dockerAvailable,
  adaptDeepAgentsSandbox,
  type SandboxBackend,

  // Structured findings
  FindingSchema,
  ToolResultSchema,
  makeFinding,
  makeToolResult,
  summarize,
  parseToolResult,
  findingsToSarif,
  sarifToFindings,
  exceedsThreshold,
  // Any assurance tool by name — see assurance-tools/index.ts
} from "@ares/engine";
```

## Structured findings

Every assurance tool that produces findings should return a `ToolResult`
envelope (a JSON-stringified payload conforming to `ToolResultSchema`):

```ts
import { makeFinding, makeToolResult, stringifyToolResult } from "@ares/engine";

const findings = [
  makeFinding({
    tool: "anchor_source_scanner",
    ruleId: "anchor.unchecked-account",
    title: "UncheckedAccount bypasses Anchor safety checks",
    kind: "vulnerability",
    severity: "high",
    confidence: "high",
    description: "…",
    location: { kind: "source", file: "programs/foo/src/lib.rs", startLine: 42 },
  }),
];
const result = makeToolResult({ tool: "anchor_source_scanner", findings });
return stringifyToolResult(result);
```

Consumers that want structured data call `SubAgent.invokeWithArtifacts()`
instead of `.invoke()`:

```ts
const { output, artifacts } = await subAgent.invokeWithArtifacts(prompt);
// `artifacts` is a ToolResult[] — one per tool call whose output was a
// valid ToolResult envelope. Use these for dashboards, CI gates, SARIF.
```

SARIF export is a one-liner:

```ts
import { findingsToSarif, mergeToolResults } from "@ares/engine";

const { findings } = mergeToolResults(artifacts);
const sarif = findingsToSarif(findings, { driverName: "asst-engine" });
```

Schema contract (see `findings/schema.ts`):

| Field               | Notes                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| `severity`          | `critical` / `high` / `medium` / `low` / `info` (lowercase, SARIF-aligned) |
| `confidence`        | `high` / `medium` / `low` — independent of severity                      |
| `kind`              | `vulnerability`, `risk`, `misconfiguration`, `secret-exposure`, `policy-violation`, `info` |
| `ruleId`            | Dotted namespace, e.g. `anchor.unchecked-account`                        |
| `location.kind`     | `source` / `chain` / `artifact` / `config`                               |
| `meta`              | Open bag for tool-specific extras (stable fields graduate out of meta)   |

## Skill retrieval

Each sub-agent ships with a short, hand-picked list of pinned skills in its
system prompt. For anything beyond that, the engine can TF-IDF-rank the rest
of `.agents/skills/` against the incoming task and splice the top-K matches
into the user message — so you don't have to pay for 40+ skills on every
call.

**Pipeline:**

1. `buildSkillCatalog(repoRoot)` — walks `.agents/skills/`, pulls
   `name`+`description` out of each `SKILL.md`'s YAML frontmatter, builds a
   TF-IDF index over those descriptions, and caches everything at
   `.asst/skills-index.json`. The cache invalidates on mtime/size change.
2. `rankSkillsForQuery(catalog, query, { topK, exclude, boost })` — returns
   descending cosine-similarity hits.
3. `loadSkillsForTask(repoRoot, query, { pinned, topK, maxChars })` — loads
   the FULL body of pinned + top-K skills, bounded by a character budget.

**Turning it on per sub-agent:**

```ts
// sub-agents.ts
{
  name: "auditor",
  skills: ["solana-defi-vulnerability-analyst-agent"], // pinned, always in system prompt
  retrievalTopK: 2, // additionally retrieve 2 skills per invoke() based on the task
  ...
}
```

Or via env (applies to all sub-agents that don't override explicitly):

```bash
ASST_SKILL_RETRIEVAL_TOPK=2
```

The retrieval budget per invoke is capped at ~12 KB (~3k tokens) so the
overhead stays predictable. Pinned skills are never dropped — only ranked
ones can be trimmed by the budget.

## Model configuration

The orchestrator and each sub-agent accept a provider-prefixed model id:

| Provider    | Example id                                   | Required env          |
| ----------- | -------------------------------------------- | --------------------- |
| `google`    | `google:gemini-2.5-flash`                    | `GOOGLE_API_KEY`      |
| `openrouter`| `openrouter:nvidia/nemotron-nano-9b-v2:free` | `OPENROUTER_API_KEY`  |
| `openai`    | `openai:gpt-4o-mini`                         | `OPENAI_API_KEY`      |
| `ollama`    | `ollama:llama3.1` (auto-resolves localhost)  | — (no key needed)     |
| `local`     | `local:mistral-7b@http://localhost:1234/v1`  | — / `ASST_LOCAL_API_KEY` |

The Orchestrator default is `$ASST_ORCHESTRATOR_MODEL` → `google:gemini-2.5-flash`.
Sub-agents have their own per-agent defaults with fallbacks; see
`SUB_AGENT_CONFIGS` in `sub-agents.ts`.

## Security model

Tools are split into read-only (`tools/readonly.ts`) and mutating
(`tools/mutating.ts`). Mutating tools are **never** attached by default;
surfaces that want them call `createMutatingTools({ askPermission, sandbox })`.

Web/API mounts must use `createPublicOrchestrator()` from
`apps/web/lib/engine-factory.ts` which forces `ASST_ALLOW_WRITE=0` unless
`ASST_WEB_ALLOW_WRITE=1`.

### Sandbox backends

Every side-effecting tool is routed through a `SandboxBackend`. The default
is `HostShellSandbox` (execa on the host — matches legacy behavior) but
deployments can swap in Docker or any deepagents provider without touching
tool code. See [`src/sandbox/README.md`](./src/sandbox/README.md) for the
full catalog; the short version is:

```ts
import { createSandbox, createMutatingTools } from "@ares/engine";

const sandbox = await createSandbox(); // honors ASST_SANDBOX_BACKEND
const tools = createMutatingTools({ sandbox, askPermission });
```

Key env vars: `ASST_SANDBOX_BACKEND` (`host`/`docker`), `ASST_CMD_TIMEOUT`,
`ASST_CMD_MAX_BYTES`, `ASST_SANDBOX_DOCKER_IMAGE`,
`ASST_SANDBOX_DOCKER_NETWORK`, `ASST_SANDBOX_DOCKER_MEMORY`,
`ASST_SANDBOX_DOCKER_CPUS`.

## Tests

```bash
pnpm --filter @ares/engine test   # engine-level schema, tool, retrieval, and sandbox tests (74 tests)
pnpm --filter @asst/cli test      # CLI + deterministic engine logic (32 tests)
```

Engine tests live under `src/__tests__/` and cover:

- `findings.test.ts` — schema validation, id determinism, summarization,
  ToolResult serialization, SARIF round-trip, CI helpers.
- `anchor-source-scanner.test.ts` — integration: runs the tool against a
  temp Anchor fixture and asserts expected `ruleId`s, severity ordering,
  rationale/location presence, and skipped-status on empty dirs.
- `skills-retrieval.test.ts` — frontmatter parsing, TF-IDF tokenizer, IDF
  math, ranker quality on synthetic corpora, catalog cache build +
  mtime invalidation, `loadSkillsForTask` budget enforcement.
- `sandbox.test.ts` — cross-platform HostShellSandbox (execute, writeFile,
  readFile, timeout, env/cwd override), deepagents adapter delegation
  (execute + upload/download round-trip, env/cwd prefixing, error
  shapes), factory env selection and docker fallback, dockerAvailable
  return-type contract.

## Build

```bash
pnpm --filter @ares/engine build
```

Emits `dist/`. Consumers import from `@ares/engine` via workspace resolution —
`dist/` is not intended to be published to npm (yet).
