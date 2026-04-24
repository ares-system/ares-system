/**
 * Sandbox factory — picks a backend based on the `ASST_SANDBOX_BACKEND`
 * env var (or an explicit override) and produces a ready-to-use
 * `SandboxBackend` instance.
 *
 * Supported values for `ASST_SANDBOX_BACKEND`:
 *   `host`   — HostShellSandbox (default; runs on the host with execa)
 *   `docker` — DockerSandbox (containerized, requires docker on PATH)
 *
 * For deepagents-backed sandboxes (Daytona, Modal, etc.), operators
 * construct the concrete provider themselves and wrap it with
 * `adaptDeepAgentsSandbox()` — this keeps the engine's runtime deps
 * small and avoids pinning provider versions in `@ares/engine`.
 */

import { DockerSandbox, dockerAvailable } from "./docker.js";
import { HostShellSandbox } from "./host-shell.js";
import type { SandboxBackend } from "./types.js";

export type SandboxBackendKind = "host" | "docker";

export interface CreateSandboxOptions {
  /** Explicit backend kind. Overrides `ASST_SANDBOX_BACKEND`. */
  kind?: SandboxBackendKind;
  /** Working directory / bind mount root. Defaults to `process.cwd()`. */
  cwd?: string;
  /**
   * When `kind === "docker"` but docker isn't available, fall back to
   * the host backend instead of throwing. Defaults to `true` so a
   * misconfigured `ASST_SANDBOX_BACKEND=docker` on a dev machine without
   * Docker Desktop still yields a usable engine.
   */
  fallbackToHostOnUnavailable?: boolean;
  /** Docker image override (pass-through to DockerSandbox). */
  dockerImage?: string;
}

function envKind(): SandboxBackendKind | undefined {
  const raw = process.env.ASST_SANDBOX_BACKEND?.trim().toLowerCase();
  if (raw === "host" || raw === "docker") return raw;
  return undefined;
}

export async function createSandbox(
  opts: CreateSandboxOptions = {},
): Promise<SandboxBackend> {
  const kind = opts.kind ?? envKind() ?? "host";

  if (kind === "docker") {
    const available = await dockerAvailable();
    if (!available) {
      const fallback = opts.fallbackToHostOnUnavailable ?? true;
      if (fallback) {
        return new HostShellSandbox({ cwd: opts.cwd });
      }
      throw new Error(
        "createSandbox: ASST_SANDBOX_BACKEND=docker but docker is not available on PATH. " +
          "Install Docker Desktop or set fallbackToHostOnUnavailable:true.",
      );
    }
    return new DockerSandbox({ cwd: opts.cwd, image: opts.dockerImage });
  }

  return new HostShellSandbox({ cwd: opts.cwd });
}

/**
 * Synchronous shortcut for call sites that don't want to `await`. Returns
 * the host backend; if the env says `docker`, that's ignored — callers
 * who need docker must use the async `createSandbox()` so availability
 * can be probed.
 */
export function createHostSandbox(
  opts: Pick<CreateSandboxOptions, "cwd"> = {},
): SandboxBackend {
  return new HostShellSandbox({ cwd: opts.cwd });
}
