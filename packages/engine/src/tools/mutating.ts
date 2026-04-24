/**
 * Mutating agent tools — write files and run arbitrary shell commands.
 *
 * SECURITY MODEL:
 *   - These tools are NEVER mounted by default on public surfaces.
 *     Use `createMutatingTools({ askPermission })` explicitly where needed.
 *   - The `askPermission` callback is the only thing between the model and
 *     the user's filesystem. CLI wires it to an interactive prompt.
 *     Web/API surfaces must either leave it undefined (blocks by default)
 *     or gate behind a server-side auth/allowlist.
 *   - All host-level effects are routed through a `SandboxBackend`. The
 *     default backend is `HostShellSandbox` (current behavior — runs on
 *     the host with execa), but deployments can swap in `DockerSandbox`
 *     or any deepagents provider via `createSandbox({ kind: "docker" })`
 *     or `adaptDeepAgentsSandbox(...)`. This is the B3 extensibility
 *     point described in `packages/engine/src/sandbox/README.md`.
 *
 * Environment:
 *   ASST_ALLOW_WRITE   — when "0" or "false", mutating tools refuse up-front.
 *                        Intended for locking down public deployments.
 *   ASST_CMD_TIMEOUT   — per-command timeout in ms (default 60_000).
 *   ASST_CMD_MAX_BYTES — max stdout+stderr size (default 10 MB).
 *   ASST_SANDBOX_BACKEND — `host` (default) or `docker`.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { HostShellSandbox } from "../sandbox/host-shell.js";
import type { SandboxBackend } from "../sandbox/types.js";

export type PermissionFn = (message: string) => Promise<boolean>;

export interface MutatingToolOptions {
  /**
   * User confirmation hook. If omitted, mutating tools refuse to act and
   * return a descriptive error — this is the safe default for server-side
   * mounts.
   */
  askPermission?: PermissionFn;
  /**
   * Working directory for the default HostShellSandbox. Ignored when an
   * explicit `sandbox` is provided. Defaults to `process.cwd()`.
   */
  cwd?: string;
  /**
   * Execution backend. When omitted a default HostShellSandbox is created
   * using `cwd`. See `@ares/engine` → `createSandbox()` for env-driven
   * selection (host / docker / deepagents-adapter).
   */
  sandbox?: SandboxBackend;
}

function writesAllowed(): boolean {
  const flag = (process.env.ASST_ALLOW_WRITE ?? "1").toLowerCase();
  return flag !== "0" && flag !== "false" && flag !== "no";
}

/**
 * Build the mutating-tools bundle.
 *
 * When `askPermission` is omitted, the tools refuse to act and return a
 * descriptive error — surfaces that don't want write power stay safe.
 */
export function createMutatingTools(opts: MutatingToolOptions = {}) {
  const ask = opts.askPermission;
  const sandbox: SandboxBackend =
    opts.sandbox ?? new HostShellSandbox({ cwd: opts.cwd });

  const writeFileTool = tool(
    async ({ path, content, explanation }) => {
      if (!writesAllowed()) {
        return "write_file refused: ASST_ALLOW_WRITE is disabled on this host.";
      }
      if (!ask) {
        return "write_file refused: no permission hook installed on this surface.";
      }
      const ok = await ask(
        `Agent wants to write to ${path}.\nReason: ${explanation}\nProceed?`,
      );
      if (!ok) return "Action cancelled by user.";
      try {
        await sandbox.writeFile(path, content);
        return `Successfully wrote to ${path} via ${sandbox.id}.`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return `Error writing to ${path}: ${msg}`;
      }
    },
    {
      name: "write_file",
      description:
        "Write or edit the contents of a file. Requires user approval and ASST_ALLOW_WRITE. " +
        "Routed through the configured sandbox backend.",
      schema: z.object({
        path: z.string().describe("Path to write to"),
        content: z.string().describe("New content for the file"),
        explanation: z
          .string()
          .describe("Why is this change necessary?"),
      }),
    },
  );

  const runTerminalCmdTool = tool(
    async ({ command, explanation }) => {
      if (!writesAllowed()) {
        return "run_terminal_cmd refused: ASST_ALLOW_WRITE is disabled on this host.";
      }
      if (!ask) {
        return "run_terminal_cmd refused: no permission hook installed on this surface.";
      }
      const ok = await ask(
        `Agent wants to run command (${sandbox.id}): ${command}\nReason: ${explanation}\nProceed?`,
      );
      if (!ok) return "Action cancelled by user.";
      try {
        const result = await sandbox.execute(command);
        const suffix = result.truncated ? "\n[output truncated]" : "";
        const code =
          result.exitCode === null ? "killed" : String(result.exitCode);
        return `Sandbox: ${sandbox.id}\nExit: ${code}${suffix}\nOutput:\n${result.output}`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return `Command failed: ${msg}`;
      }
    },
    {
      name: "run_terminal_cmd",
      description:
        "Execute a shell command. Requires user approval and ASST_ALLOW_WRITE. " +
        "Routed through the configured sandbox backend (host by default; docker " +
        "or deepagents provider if ASST_SANDBOX_BACKEND is set).",
      schema: z.object({
        command: z.string().describe("The shell command to run"),
        explanation: z
          .string()
          .describe("Why is this command necessary?"),
      }),
    },
  );

  return { writeFileTool, runTerminalCmdTool };
}
