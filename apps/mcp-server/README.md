# @asst/mcp-server

MCP (Model Context Protocol, stdio transport) server that exposes the ASST
assurance toolset to MCP clients such as Cursor and Claude Desktop.

All tool implementations live in `@ares/engine`; this server is a thin
adapter that maps LangChain tool objects to MCP tool definitions.

## Tools exposed

| MCP name                           | Backing implementation                       |
| ---------------------------------- | -------------------------------------------- |
| `asst_program_account_analyzer`    | `programAccountAnalyzerTool`                 |
| `asst_program_upgrade_monitor`     | `programUpgradeMonitorTool`                  |
| `asst_cpi_graph_mapper`            | `cpiGraphMapperTool`                         |
| `asst_account_state_snapshot`      | `accountStateSnapshotTool`                   |
| `asst_secret_scanner`              | `secretScannerTool`                          |
| `asst_env_hygiene_check`           | `envHygieneCheckTool`                        |
| `asst_unified_posture_report`      | `unifiedPostureReportTool`                   |
| `asst_semgrep_scan`                | `runSemgrepScan` (spawns `semgrep` CLI)      |
| `asst_merge_sarif`                 | `mergeSarifLogs` / `parseSarifJson`          |
| `asst_git_diff_summary`            | `git diff --stat` / `git status --porcelain` |
| `asst_solana_rpc_read`             | Read-only JSON-RPC POST                      |
| `asst_write_assurance_manifest`    | `pnpm exec tsx examples/assurance-run/…`     |

## Install / run

```bash
pnpm --filter @asst/mcp-server build     # compile to dist/
pnpm --filter @asst/mcp-server dev       # run via tsx
pnpm --filter @asst/mcp-server start     # run compiled build
```

## Wiring into Cursor

```jsonc
// .cursor/mcp.json
{
  "mcpServers": {
    "asst-assurance": {
      "command": "node",
      "args": ["C:/Users/you/Documents/ASST/apps/mcp-server/dist/server.js"],
      "env": {
        "GOOGLE_API_KEY": "…",
        "SOLANA_RPC_URL": "…"
      }
    }
  }
}
```

## Security posture

The MCP server loads `@ares/engine` tools directly. These tools are the
**read-only and well-bounded** ones (SARIF merge, RPC read, secret scan,
etc.) — the mutating tools (`write_file`, `run_terminal_cmd`) are never
registered here because MCP clients can trigger them without per-call
confirmation.
