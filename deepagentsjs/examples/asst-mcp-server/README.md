# ASST Assurance — MCP server (`stdio`)

Model Context Protocol server that exposes the same **five** assurance capabilities as the LangChain tools in [`../assurance-tools`](../assurance-tools):

| MCP tool | LangChain equivalent | Notes |
|----------|----------------------|--------|
| `asst_semgrep_scan` | (pipeline) / `runSemgrepScan` | Needs `semgrep` on `PATH` |
| `asst_merge_sarif` | `merge_findings` | Uses `mergeSarifLogs` from `@asst/assurance-run` |
| `asst_git_diff_summary` | `git_diff_summary` | Read-only `git` |
| `asst_solana_rpc_read` | `solana_rpc_read` | Set `SOLANA_RPC_URL` for custom RPC |
| `asst_write_assurance_manifest` | `write_assurance_manifest` | Runs `pnpm exec tsx examples/assurance-run/write-run-manifest.ts` from `deepagentsjs/` |

This is **not** a substitute for sandboxed `execute` policies: Semgrep and manifest still run subprocesses; lock down `cwd` / repo paths in your deployment.

## Run locally

From the **`deepagentsjs/`** directory (workspace root for this package):

```bash
pnpm exec tsx examples/asst-mcp-server/src/server.ts
```

The process speaks MCP over **stdin/stdout** — do not attach a TTY logger that writes to stdout.

## Cursor / Claude Code–style config

Use **`cwd`** = the absolute path to **`deepagentsjs/`** in this repo so `pnpm` and `examples/` resolve correctly.

**Example (generic MCP client):**

```json
{
  "mcpServers": {
    "asst-assurance": {
      "command": "pnpm",
      "args": ["exec", "tsx", "examples/asst-mcp-server/src/server.ts"],
      "cwd": "/path/to/ASST/deepagentsjs"
    }
  }
}
```

**Claude Code plugin** (see [mcp-integration](https://docs.claude.com/en/docs/claude-code/mcp)): put the same `command` / `args` / `cwd` under `mcpServers` in `.mcp.json` or `plugin.json`, using `${CLAUDE_PLUGIN_ROOT}` only if you bundle this tree inside a plugin.

## Relationship to `createDeepAgent`

- **MCP** = how a **client** (IDE, Claude Code, another agent host) discovers and calls tools over stdio/SSE/HTTP.
- **`createDeepAgent({ tools: [...] })`** = register **LangChain `StructuredTool`** instances in-process.

You can use **either** pattern; for the same behavior without MCP, keep using [`assurance-run-agent.ts`](../assurance-tools/assurance-run-agent.ts). To let a **remote or IDE-hosted** MCP client drive assurance, use this server.
