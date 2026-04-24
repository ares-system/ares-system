/**
 * Pluggable sandbox execution surface for mutating tools.
 *
 * See `README.md` in this directory for the full map; the high-level API
 * is:
 *
 *   import { createSandbox, createMutatingTools } from "@ares/engine";
 *
 *   const sandbox = await createSandbox(); // honors ASST_SANDBOX_BACKEND
 *   const { writeFileTool, runTerminalCmdTool } = createMutatingTools({
 *     sandbox,
 *     askPermission: myInteractivePrompt,
 *   });
 */

export type {
  SandboxBackend,
  ExecuteOptions,
  ExecuteResponse,
} from "./types.js";
export { SandboxError } from "./types.js";
export { HostShellSandbox, type HostShellSandboxOptions } from "./host-shell.js";
export {
  DockerSandbox,
  dockerAvailable,
  type DockerSandboxOptions,
} from "./docker.js";
export {
  adaptDeepAgentsSandbox,
  type DeepAgentsSandboxLike,
  type AdaptDeepAgentsSandboxOptions,
} from "./deepagents-adapter.js";
export {
  createSandbox,
  createHostSandbox,
  type CreateSandboxOptions,
  type SandboxBackendKind,
} from "./factory.js";
