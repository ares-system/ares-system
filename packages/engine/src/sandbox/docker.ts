/**
 * DockerSandbox — run each command in a throwaway Docker container.
 *
 * Much stronger isolation than HostShellSandbox (no filesystem access
 * outside the bind mount, no network by default, fresh rootfs per run),
 * with two trade-offs worth knowing:
 *
 *   1. Startup cost — `docker run --rm` typically adds 300-800 ms to every
 *      command. Acceptable for CI/assurance runs; painful for interactive
 *      chat, so keep it opt-in.
 *   2. Host requirement — docker must be installed and the engine must
 *      have permission to talk to the daemon (on Linux: the socket at
 *      /var/run/docker.sock, on Windows/macOS: Docker Desktop running).
 *      `dockerAvailable()` probes this at startup.
 *
 * File writes go into a bind-mounted directory on the host (default:
 * `process.cwd()`), so `writeFile`/`readFile` are plain host FS ops —
 * the container just sees them at `/workspace/<relative-path>`.
 *
 * Environment knobs:
 *   ASST_SANDBOX_DOCKER_IMAGE  default container image (default: alpine:3.20)
 *   ASST_SANDBOX_DOCKER_NETWORK `none` / `host` / `bridge` (default: `none`)
 *   ASST_SANDBOX_DOCKER_MEMORY  memory limit, e.g. `512m` (default unset)
 *   ASST_SANDBOX_DOCKER_CPUS    CPU limit, e.g. `1.0` (default unset)
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

export interface DockerSandboxOptions {
  /** Host directory bind-mounted into the container. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Mount point inside the container. Defaults to `/workspace`. */
  containerMountPath?: string;
  /** Container image. Defaults to `ASST_SANDBOX_DOCKER_IMAGE` or `alpine:3.20`. */
  image?: string;
  /** Default per-command timeout (ms). Falls back to `ASST_CMD_TIMEOUT` or 60s. */
  timeoutMs?: number;
  /** Default output cap (bytes). Falls back to `ASST_CMD_MAX_BYTES` or 10 MB. */
  maxBytes?: number;
  /** Docker network mode. Defaults to `ASST_SANDBOX_DOCKER_NETWORK` or `none`. */
  network?: "none" | "host" | "bridge" | string;
  /** Memory limit (e.g. `"512m"`). Defaults to `ASST_SANDBOX_DOCKER_MEMORY` or unset. */
  memory?: string;
  /** CPU limit (e.g. `"1.0"`). Defaults to `ASST_SANDBOX_DOCKER_CPUS` or unset. */
  cpus?: string;
  /** Extra `docker run` args appended before the image. */
  extraDockerArgs?: string[];
  /** Base env passed into the container. Defaults to nothing (clean slate). */
  env?: Record<string, string>;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Probe whether docker is usable on this host. Cheap: a single
 * `docker version --format {{.Server.Version}}` with a short timeout.
 * Returns `true` only on exit code 0; any error is treated as "no docker".
 */
export async function dockerAvailable(): Promise<boolean> {
  try {
    const res = await execa("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeout: 5_000,
      reject: false,
    });
    return res.exitCode === 0;
  } catch {
    return false;
  }
}

export class DockerSandbox implements SandboxBackend {
  readonly isHostLocal = false;

  private readonly hostCwd: string;
  private readonly mountPath: string;
  private readonly image: string;
  private readonly defaultTimeout: number;
  private readonly defaultMaxBytes: number;
  private readonly network: string;
  private readonly memory?: string;
  private readonly cpus?: string;
  private readonly extraArgs: string[];
  private readonly baseEnv: Record<string, string>;

  constructor(opts: DockerSandboxOptions = {}) {
    this.hostCwd = path.resolve(opts.cwd ?? process.cwd());
    this.mountPath = opts.containerMountPath ?? "/workspace";
    this.image = opts.image ?? process.env.ASST_SANDBOX_DOCKER_IMAGE ?? "alpine:3.20";
    this.defaultTimeout = opts.timeoutMs ?? envNumber("ASST_CMD_TIMEOUT", 60_000);
    this.defaultMaxBytes = opts.maxBytes ?? envNumber("ASST_CMD_MAX_BYTES", 10 * 1024 * 1024);
    this.network = opts.network ?? process.env.ASST_SANDBOX_DOCKER_NETWORK ?? "none";
    this.memory = opts.memory ?? process.env.ASST_SANDBOX_DOCKER_MEMORY;
    this.cpus = opts.cpus ?? process.env.ASST_SANDBOX_DOCKER_CPUS;
    this.extraArgs = opts.extraDockerArgs ?? [];
    this.baseEnv = opts.env ?? {};
  }

  get id(): string {
    return `docker:${this.image}`;
  }

  async execute(command: string, opts: ExecuteOptions = {}): Promise<ExecuteResponse> {
    const timeout = opts.timeoutMs ?? this.defaultTimeout;
    const maxBuffer = opts.maxBytes ?? this.defaultMaxBytes;
    const cwd = opts.cwd
      ? path.posix.join(this.mountPath, opts.cwd.replace(/\\/g, "/"))
      : this.mountPath;

    const mergedEnv = { ...this.baseEnv, ...(opts.env ?? {}) };
    const envFlags: string[] = [];
    for (const [k, v] of Object.entries(mergedEnv)) {
      envFlags.push("-e", `${k}=${v}`);
    }

    const resourceFlags: string[] = [];
    if (this.memory) resourceFlags.push("--memory", this.memory);
    if (this.cpus) resourceFlags.push("--cpus", this.cpus);

    const args = [
      "run",
      "--rm",
      "-i",
      "--network", this.network,
      "-v", `${this.hostCwd}:${this.mountPath}`,
      "-w", cwd,
      ...envFlags,
      ...resourceFlags,
      ...this.extraArgs,
      this.image,
      "sh",
      "-c",
      command,
    ];

    try {
      const result = await execa("docker", args, {
        timeout,
        maxBuffer,
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
        output: `docker run failed to spawn: ${msg}`,
        exitCode: null,
        truncated: false,
      };
    }
  }

  async writeFile(target: string, content: string | Uint8Array): Promise<void> {
    const full = path.resolve(this.hostCwd, target);
    try {
      await fs.mkdir(path.dirname(full), { recursive: true });
      if (typeof content === "string") {
        await fs.writeFile(full, content, "utf-8");
      } else {
        await fs.writeFile(full, content);
      }
    } catch (e) {
      throw new SandboxError(
        `DockerSandbox.writeFile(${target}) failed: ${e instanceof Error ? e.message : String(e)}`,
        e,
      );
    }
  }

  async readFile(target: string): Promise<Uint8Array> {
    const full = path.resolve(this.hostCwd, target);
    try {
      const buf = await fs.readFile(full);
      return new Uint8Array(buf);
    } catch (e) {
      throw new SandboxError(
        `DockerSandbox.readFile(${target}) failed: ${e instanceof Error ? e.message : String(e)}`,
        e,
      );
    }
  }

  /** No-op: `docker run --rm` cleans up the container automatically. */
  async close(): Promise<void> {
    // intentional no-op — `--rm` removes the container when the process exits
  }
}
