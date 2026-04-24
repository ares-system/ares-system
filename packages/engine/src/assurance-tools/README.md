# Assurance tools

LangChain-compatible tool objects used by the ASST sub-agents and re-exposed
via the MCP server. Import from `@ares/engine` rather than from this folder
directly.

| File                              | Exported symbol                     | Purpose                                                                       |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `anchor-source-scanner.ts`        | `anchorSourceScannerTool`           | Heuristic Rust/Anchor static scan (~13 patterns, severity+confidence)         |
| `secret-scanner.ts`               | `secretScannerTool`                 | Git-history secret sweep (24 patterns + Shannon entropy)                      |
| `env-hygiene-check.ts`            | `envHygieneCheckTool`               | Verifies `.env.example` present and `.env` ignored                            |
| `token-concentration.ts`          | `tokenConcentrationTool`            | SPL token holder HHI + Gini concentration                                     |
| `solana-rpc-read.ts`              | `solanaRpcReadTool`                 | Read-only JSON-RPC calls                                                      |
| `program-account-analyzer.ts`     | `programAccountAnalyzerTool`        | Program → owned accounts summary                                              |
| `program-upgrade-monitor.ts`      | `programUpgradeMonitorTool`         | BPF-loader and ProgramData authority checks                                   |
| `cpi-graph-mapper.ts`             | `cpiGraphMapperTool`                | Anchor IDL walker, surfaces instructions & CPI surface                        |
| `account-state-snapshot.ts`       | `accountStateSnapshotTool`          | Writes raw account state to `assurance/snapshots/`                            |
| `git-clone-repo.ts`               | `gitCloneRepoTool`                  | Shallow clone external targets for offline analysis                           |
| `git-diff-summary.ts`             | `gitDiffSummaryTool`                | `git diff --stat` or `git status --porcelain`                                 |
| `merge-sarif.ts`                  | `mergeSarifLogs`, `parseSarifJson`  | Pure helpers (also used by CI)                                                |
| `merge-findings-tool.ts`          | `mergeFindingsTool`                 | Tool wrapper that merges multiple SARIF files                                 |
| `run-semgrep.ts`                  | `runSemgrepScan`                    | Spawns `semgrep` CLI, returns SARIF path or skips                             |
| `write-assurance-manifest-tool.ts`| `writeAssuranceManifestTool`        | Shells out to the manifest writer in `deepagentsjs/examples/assurance-run/`   |
| `unified-posture-report.ts`       | `unifiedPostureReportTool`          | Six-layer posture score aggregator                                            |
| `generate-pdf-report-tool.ts`     | `generatePdfReportTool`             | jsPDF report renderer                                                         |

## Output contract — `ToolResult` envelope

Finding-producing tools return a **JSON-stringified `ToolResult`** (see
`../findings/schema.ts`). The envelope looks like:

```jsonc
{
  "version": 1,
  "tool": "anchor_source_scanner",
  "status": "ok",           // "ok" | "partial" | "error" | "skipped"
  "findings": [ /* Finding[] */ ],
  "summary": {
    "total": 7,
    "bySeverity": { "critical": 0, "high": 2, "medium": 3, "low": 2, "info": 0 },
    "byConfidence": { "high": 3, "medium": 3, "low": 1 },
    "worstSeverity": "high"
  },
  "humanSummary": "## anchor_source_scanner — status: ok …",
  "durationMs": 41,
  "meta": { /* tool-specific */ }
}
```

Hosts recover structure with `parseToolResult(raw)` or via
`SubAgent.invokeWithArtifacts()`, which collects every envelope from a
single agent invocation.

### Current adoption

| Tool                        | Emits `ToolResult` envelope |
| --------------------------- | :-------------------------: |
| `anchorSourceScannerTool`   |              ✓              |
| `envHygieneCheckTool`       |              ✓              |
| `secretScannerTool`         |           pending           |
| `tokenConcentrationTool`    |           pending           |
| `programAccountAnalyzerTool`|           pending           |
| `programUpgradeMonitorTool` |           pending           |
| `cpiGraphMapperTool`        |           pending           |
| `accountStateSnapshotTool`  |        not applicable (writes artifact) |
| `unifiedPostureReportTool`  |           pending           |
| `runSemgrepScan`            |        not applicable (writes SARIF)    |
| `mergeFindingsTool`         |        not applicable (writes SARIF)    |
| `generatePdfReportTool`     |        not applicable (writes PDF)      |
| `gitDiffSummaryTool`        |        not applicable (narrative text)  |
| `gitCloneRepoTool`          |        not applicable (writes files)    |
| `writeAssuranceManifestTool`|        not applicable (shells out)      |

Pending tools keep their legacy string output until migrated; existing
hosts keep working unchanged.

## Design notes

- Every finding-producing tool uses `makeFinding(...)` + `makeToolResult(...)`
  from `@ares/engine`. These helpers generate stable ids, validate against
  the Zod schema, and sort findings by severity.
- Heuristic regex tools (`anchor-source-scanner`, parts of `secret-scanner`)
  must carry a `confidence` field so downstream consumers can filter noise.
  Regex-only hits should cap at `medium`; `critical` / `high` are reserved
  for signals with near-zero false-positive rates.
- `ruleId`s are dotted namespaces: `anchor.<rule>`, `secret.<pattern>`,
  `env-hygiene.<rule>`, `token-concentration.<metric>`, etc. CI allowlists
  and SARIF exports rely on this.
- External binary dependencies (`semgrep`, `git`) are invoked cross-platform
  (via `execa`). Missing binaries degrade gracefully (`status: "skipped"`
  rather than a hard error).
