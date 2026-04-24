/**
 * adaptDeepAgentsSandbox — wrap a deepagents `BaseSandbox` as our
 * `SandboxBackend`.
 *
 * The deepagents library ships five provider packages (daytona, deno,
 * modal, node-vfs, quickjs) whose sandboxes all extend the same
 * `BaseSandbox` abstract class with {`execute`, `uploadFiles`,
 * `downloadFiles`}. Our `SandboxBackend` is a strict subset of that
 * surface, so a tiny adapter is enough to reuse the entire ecosystem.
 *
 * We keep the dependency one-way: `@ares/engine` knows nothing about
 * deepagents at build time. Callers pass in an instance they constructed
 * themselves (via `new DaytonaSandbox(...)` etc.), we only call the
 * minimal three methods.
 *
 * Structural typing is intentional — we don't `import` the concrete
 * deepagents types, which keeps the engine's dependency graph lean and
 * makes this adapter usable even with future provider versions that add
 * extra optional methods.
 */

import {
  SandboxError,
  type ExecuteOptions,
  type ExecuteResponse,
  type SandboxBackend,
} from "./types.js";

/**
 * Minimal structural type for any deepagents-style sandbox. Matches the
 * `BaseSandbox` class in `deepagents/libs/deepagents/src/backends/sandbox.ts`.
 */
export interface DeepAgentsSandboxLike {
  readonly id?: string;
  execute(command: string): Promise<ExecuteResponse> | ExecuteResponse;
  uploadFiles(
    files: Array<[string, Uint8Array]>,
  ):
    | Promise<Array<{ path: string; error: string | null }>>
    | Array<{ path: string; error: string | null }>;
  downloadFiles(
    paths: string[],
  ):
    | Promise<Array<{ path: string; content: Uint8Array | null; error: string | null }>>
    | Array<{ path: string; content: Uint8Array | null; error: string | null }>;
  close?(): Promise<void> | void;
}

export interface AdaptDeepAgentsSandboxOptions {
  /** Override the adapter's `id`. Defaults to `deepagents:<innerId ?? "backend">`. */
  id?: string;
  /** Whether this sandbox runs on the same host as the engine. Default: `false`. */
  isHostLocal?: boolean;
}

/**
 * Wrap a deepagents `BaseSandbox` (or any structurally-compatible object)
 * as a `SandboxBackend`. Timeouts and environment options are honored on
 * a best-effort basis — most deepagents providers apply timeouts server-
 * side, and passing `env` isn't part of the upstream contract (yet), so
 * we inline `env` into the command when requested.
 */
export function adaptDeepAgentsSandbox(
  inner: DeepAgentsSandboxLike,
  opts: AdaptDeepAgentsSandboxOptions = {},
): SandboxBackend {
  const id = opts.id ?? `deepagents:${inner.id ?? "backend"}`;
  const isHostLocal = opts.isHostLocal ?? false;

  async function execute(
    command: string,
    execOpts: ExecuteOptions = {},
  ): Promise<ExecuteResponse> {
    let finalCommand = command;
    if (execOpts.env && Object.keys(execOpts.env).length > 0) {
      const prefix = Object.entries(execOpts.env)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(" ");
      finalCommand = `${prefix} ${command}`;
    }
    if (execOpts.cwd) {
      finalCommand = `cd ${JSON.stringify(execOpts.cwd)} && ${finalCommand}`;
    }

    try {
      const res = await Promise.resolve(inner.execute(finalCommand));
      return {
        output: res.output ?? "",
        exitCode: res.exitCode ?? null,
        truncated: Boolean(res.truncated),
      };
    } catch (e) {
      return {
        output: `deepagents backend execute() threw: ${e instanceof Error ? e.message : String(e)}`,
        exitCode: null,
        truncated: false,
      };
    }
  }

  async function writeFile(
    targetPath: string,
    content: string | Uint8Array,
  ): Promise<void> {
    const payload =
      typeof content === "string"
        ? new TextEncoder().encode(content)
        : content;
    const results = await Promise.resolve(
      inner.uploadFiles([[targetPath, payload]]),
    );
    const r = results[0];
    if (!r || r.error) {
      throw new SandboxError(
        `deepagents adapter writeFile(${targetPath}) failed: ${r?.error ?? "empty result"}`,
      );
    }
  }

  async function readFile(targetPath: string): Promise<Uint8Array> {
    const results = await Promise.resolve(inner.downloadFiles([targetPath]));
    const r = results[0];
    if (!r || r.error || !r.content) {
      throw new SandboxError(
        `deepagents adapter readFile(${targetPath}) failed: ${r?.error ?? "empty result"}`,
      );
    }
    return r.content;
  }

  async function close(): Promise<void> {
    if (typeof inner.close === "function") {
      await Promise.resolve(inner.close());
    }
  }

  return { id, isHostLocal, execute, writeFile, readFile, close };
}
