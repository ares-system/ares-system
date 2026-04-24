/**
 * HostShellSandbox — run commands directly on the host via `execa`.
 *
 * This is the default backend and preserves the engine's historical
 * behavior: the `run_terminal_cmd` tool always ran on the operator's
 * machine, gated only by the interactive permission prompt. That is
 * *not* true isolation — it exists so the developer CLI keeps working
 * on a plain laptop without docker or remote infrastructure.
 *
 * Production / multi-tenant deployments should switch to DockerSandbox
 * or a deepagents provider (Daytona, Modal, …) by setting
 * `ASST_SANDBOX_BACKEND=docker` (or calling `createSandbox` explicitly).
 *
 * Cross-platform: `execa` with `shell: true` picks cmd.exe on Windows
 * and /bin/sh elsewhere, avoiding the hard-coded shell paths that used
 * to plague the codebase (see A10 in the cleanup plan).
 */

import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

import {
  SandboxError,
  type ExecuteOptions,
  type ExecuteResponse,
  type SandboxBackend,
} from "./types.js";

export interface HostShellSandboxOptions {
  /** Base cwd for executed commands and file ops. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Default timeout in ms. Falls back to `ASST_CMD_TIMEOUT` env then 60s. */
  timeoutMs?: number;
  /** Default output cap in bytes. Falls back to `ASST_CMD_MAX_BYTES` env then 10 MB. */
  maxBytes?: number;
  /** Optional environment filter. Default: pass `process.env` through unchanged. */
  env?: Record<string, string | undefined>;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export class HostShellSandbox implements SandboxBackend {
  readonly id = "host-shell";
  readonly isHostLocal = true;

  private readonly cwd: string;
  private readonly defaultTimeout: number;
  private readonly defaultMaxBytes: number;
  private readonly baseEnv: Record<string, string | undefined>;

  constructor(opts: HostShellSandboxOptions = {}) {
    this.cwd = path.resolve(opts.cwd ?? process.cwd());
    this.defaultTimeout = opts.timeoutMs ?? envNumber("ASST_CMD_TIMEOUT", 60_000);
    this.defaultMaxBytes = opts.maxBytes ?? envNumber("ASST_CMD_MAX_BYTES", 10 * 1024 * 1024);
    this.baseEnv = opts.env ?? process.env;
  }

  async execute(command: string, opts: ExecuteOptions = {}): Promise<ExecuteResponse> {
    const timeout = opts.timeoutMs ?? this.defaultTimeout;
    const maxBuffer = opts.maxBytes ?? this.defaultMaxBytes;
    const cwd = opts.cwd ? path.resolve(this.cwd, opts.cwd) : this.cwd;

    try {
      const result = await execa(command, {
        cwd,
        shell: true,
        timeout,
        maxBuffer,
        env: { ...this.baseEnv, ...(opts.env ?? {}) },
        reject: false,
        all: true,
      });

      const output = result.all ?? `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      return {
        output,
        exitCode: result.timedOut ? null : (result.exitCode ?? null),
        truncated: Boolean((result as { isMaxBuffer?: boolean }).isMaxBuffer),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        output: `Command failed to spawn: ${msg}`,
        exitCode: null,
        truncated: false,
      };
    }
  }

  async writeFile(target: string, content: string | Uint8Array): Promise<void> {
    const full = path.resolve(this.cwd, target);
    try {
      await fs.mkdir(path.dirname(full), { recursive: true });
      if (typeof content === "string") {
        await fs.writeFile(full, content, "utf-8");
      } else {
        await fs.writeFile(full, content);
      }
    } catch (e) {
      throw new SandboxError(
        `HostShellSandbox.writeFile(${target}) failed: ${e instanceof Error ? e.message : String(e)}`,
        e,
      );
    }
  }

  async readFile(target: string): Promise<Uint8Array> {
    const full = path.resolve(this.cwd, target);
    try {
      const buf = await fs.readFile(full);
      return new Uint8Array(buf);
    } catch (e) {
      throw new SandboxError(
        `HostShellSandbox.readFile(${target}) failed: ${e instanceof Error ? e.message : String(e)}`,
        e,
      );
    }
  }

  /** No-op: host backend owns no external resources. */
  async close(): Promise<void> {
    // intentional no-op
  }
}
