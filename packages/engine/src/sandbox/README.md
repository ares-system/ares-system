# Sandbox execution surface

Pluggable backend for every side-effecting agent tool (`run_terminal_cmd`, `write_file`, and anything else registered via `createMutatingTools`). The goal is to give operators a single knob for "where does the agent's shell actually run?" — from the operator's laptop all the way to a remote Daytona/Modal workspace — without rewriting the rest of the engine.

## Files in this directory

| File | Purpose |
| --- | --- |
| [`types.ts`](./types.ts) | `SandboxBackend` interface, `ExecuteResponse`, `SandboxError`. |
| [`host-shell.ts`](./host-shell.ts) | **Default.** Runs commands on the host via `execa` (cross-platform; cmd.exe on Windows, /bin/sh on POSIX). |
| [`docker.ts`](./docker.ts) | One-shot Docker container per command with bind mount, configurable network mode, memory/CPU caps. Also exports `dockerAvailable()` probe. |
| [`deepagents-adapter.ts`](./deepagents-adapter.ts) | Wraps any `deepagents` `BaseSandbox` (Daytona, Modal, Deno, node-vfs, QuickJS) as a `SandboxBackend`. |
| [`factory.ts`](./factory.ts) | `createSandbox({ kind })` env-driven picker; graceful docker → host fallback. |
| [`index.ts`](./index.ts) | Barrel export. |

## Choosing a backend

```ts
import { createSandbox, createMutatingTools } from "@ares/engine";

const sandbox = await createSandbox(); // honors ASST_SANDBOX_BACKEND
const tools = createMutatingTools({
  sandbox,
  askPermission: myInteractivePrompt, // CLI prompt, web allowlist, etc.
});
```

| Backend | `ASST_SANDBOX_BACKEND` | Isolation | Startup overhead | When to use |
| --- | --- | --- | --- | --- |
| `HostShellSandbox` | `host` (default) | None (permission prompt only) | ~0 ms | Dev CLI, single-operator workflows |
| `DockerSandbox` | `docker` | Process + FS (bind mount) + network off | 300–800 ms/command | CI, multi-tenant servers, anything the Internet talks to |
| `adaptDeepAgentsSandbox(...)` | — (pass instance explicitly) | Depends on provider | Varies | Remote workspaces (Daytona, Modal), in-browser (node-vfs, QuickJS) |

## Environment knobs

| Variable | Default | Meaning |
| --- | --- | --- |
| `ASST_SANDBOX_BACKEND` | `host` | `host` or `docker` — used by `createSandbox()`. |
| `ASST_CMD_TIMEOUT` | `60000` | Per-command timeout (ms). |
| `ASST_CMD_MAX_BYTES` | `10485760` | Output cap (bytes); combined stdout+stderr. |
| `ASST_ALLOW_WRITE` | `1` | Set to `0`/`false` to disable mutating tools globally regardless of backend. |
| `ASST_SANDBOX_DOCKER_IMAGE` | `alpine:3.20` | Image used by `DockerSandbox` when no override is passed. |
| `ASST_SANDBOX_DOCKER_NETWORK` | `none` | Container network mode (`none`, `host`, `bridge`). |
| `ASST_SANDBOX_DOCKER_MEMORY` | _(unset)_ | e.g. `512m`. |
| `ASST_SANDBOX_DOCKER_CPUS` | _(unset)_ | e.g. `1.0`. |

## Adapting a deepagents provider

`deepagents` ships five provider packages that all subclass the same `BaseSandbox` abstract class. Our `SandboxBackend` is a strict subset of that interface, so a ~20-line adapter is enough:

```ts
import { DaytonaSandbox } from "deepagents-daytona";
import { adaptDeepAgentsSandbox, createMutatingTools } from "@ares/engine";

const inner = new DaytonaSandbox({ workspaceId: "..." });
const sandbox = adaptDeepAgentsSandbox(inner, {
  id: "daytona:my-workspace",
  isHostLocal: false,
});

const tools = createMutatingTools({ sandbox, askPermission });
```

`@ares/engine` never imports deepagents directly, keeping its dependency graph lean. The structural `DeepAgentsSandboxLike` type in `deepagents-adapter.ts` is all we ever rely on.

## Safety notes

1. **Host backend is not isolation.** It's there for dev ergonomics. Pair it with a strict `askPermission` callback and `ASST_ALLOW_WRITE=0` on public surfaces.
2. **Permission hooks are a hard gate.** Every mutating tool refuses to act when `askPermission` is undefined — there is no "pass-through" default on purpose.
3. **Docker network defaults to `none`.** Change to `bridge`/`host` only when commands genuinely need outbound network.
4. **Output is capped at 10 MB per call.** Truncation is reported in `ExecuteResponse.truncated`; callers MUST surface that to the operator.

## Tests

```bash
pnpm --filter @ares/engine test
```

See [`../__tests__/sandbox.test.ts`](../__tests__/sandbox.test.ts) — 21 tests cover cross-platform execute, file round-trip (string & binary), timeout enforcement, env/cwd overrides, adapter delegation, env-driven factory selection, and the `dockerAvailable()` probe's return-type contract.
