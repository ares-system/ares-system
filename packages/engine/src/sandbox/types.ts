/**
 * Minimal sandbox execution surface for mutating tools.
 *
 * Design goal: give surfaces (CLI, MCP, web API) a single pluggable way to
 * isolate side-effects from the host. Concrete backends range from "run on
 * host with execa" (HostShellSandbox — default, current behavior) through
 * "run in a throwaway Docker container" (DockerSandbox) all the way to the
 * deepagents provider ecosystem (Daytona, Modal, Deno, node-vfs, QuickJS)
 * via the adapter in `deepagents-adapter.ts`.
 *
 * The interface is intentionally a strict subset of deepagents'
 * `BaseSandbox` so a deepagents backend can be adapted with a ~20-line
 * wrapper. We only require `execute`, `writeFile`, and `readFile` because
 * those are all the engine's mutating tools need today.
 */

export interface ExecuteResponse {
  /** Combined stdout + stderr (may be truncated — see `truncated`). */
  output: string;
  /** Exit code. `null` when the process was killed (timeout, OOM, etc.). */
  exitCode: number | null;
  /** True when the output buffer was capped before the process finished. */
  truncated: boolean;
}

export interface ExecuteOptions {
  /**
   * Override the default backend timeout (ms). Respected on a best-effort
   * basis — some backends (e.g. Docker) apply the timeout at the container
   * level and may overshoot by the graceful-stop window.
   */
  timeoutMs?: number;
  /**
   * Override the default maximum output size (bytes). If unset, the
   * backend's configured cap applies.
   */
  maxBytes?: number;
  /**
   * Per-command environment overrides. Merged on top of the backend's
   * base environment (usually `process.env`, possibly filtered).
   */
  env?: Record<string, string>;
  /**
   * Working directory for the command, relative to the sandbox root.
   * Defaults to the sandbox's configured cwd.
   */
  cwd?: string;
}

/**
 * Minimal execution surface for mutating tools.
 *
 * All methods MUST be idempotent w.r.t. the backend's own state: repeated
 * `writeFile(path, same-content)` calls should be safe and produce the same
 * result, and a failed `execute()` should leave the backend in a usable
 * state for the next call.
 */
export interface SandboxBackend {
  /**
   * Human-readable identifier, e.g. `host-shell`, `docker:ubuntu:22.04`,
   * `deepagents:daytona:<workspaceId>`. Used in logs and the `list_tools`
   * introspection surface so operators know which backend is active.
   */
  readonly id: string;

  /**
   * Whether this backend runs on the same host as the engine. Host-level
   * operations (editing the user's repo, running local git, etc.) should
   * only be mounted when this is `true`; remote sandboxes need an explicit
   * file upload/download step first.
   */
  readonly isHostLocal: boolean;

  /** Execute a shell command and collect combined stdout+stderr. */
  execute(command: string, opts?: ExecuteOptions): Promise<ExecuteResponse>;

  /** Write a UTF-8 string or raw bytes to a file inside the sandbox. */
  writeFile(path: string, content: string | Uint8Array): Promise<void>;

  /** Read a file from inside the sandbox as raw bytes. */
  readFile(path: string): Promise<Uint8Array>;

  /**
   * Optional cleanup hook. Host-local backends usually no-op; remote
   * backends should dispose workspaces, close sockets, etc.
   */
  close?(): Promise<void>;
}

/** Thrown when a sandbox operation fails in a way the caller should surface. */
export class SandboxError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SandboxError";
  }
}
