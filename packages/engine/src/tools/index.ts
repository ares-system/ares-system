/**
 * Tools exported by @ares/engine.
 *
 * `readFileTool` is always safe and is re-exported for convenience.
 *
 * For `writeFileTool` / `runTerminalCmdTool`, use the factory
 * `createMutatingTools({ askPermission, cwd })`. Surfaces that should not be
 * able to mutate the host filesystem must simply not call the factory —
 * legacy code that still imports the default exports below will receive a
 * bundle whose mutating tools refuse every call when no permission hook has
 * been registered (see BACKWARD_COMPAT_TOOLS below).
 */
export { readFileTool } from "./readonly.js";
export {
  createMutatingTools,
  type MutatingToolOptions,
  type PermissionFn,
} from "./mutating.js";

// ─── Backward-compat: global permission hook bridge ─────────────────
//
// The legacy API installed `globalThis.ARES_ASK_PERMISSION` from the host
// app. To keep that working for any out-of-tree consumer, we build a
// default mutating bundle here that reads the global at invocation time.
//
// New code should prefer `createMutatingTools(...)` and avoid the global.

import { createMutatingTools } from "./mutating.js";

declare global {
  // eslint-disable-next-line no-var
  var ARES_ASK_PERMISSION:
    | ((message: string) => Promise<boolean>)
    | undefined;
}

const legacyBundle = createMutatingTools({
  askPermission: (msg) =>
    globalThis.ARES_ASK_PERMISSION
      ? globalThis.ARES_ASK_PERMISSION(msg)
      : Promise.resolve(false),
});

export const writeFileTool = legacyBundle.writeFileTool;
export const runTerminalCmdTool = legacyBundle.runTerminalCmdTool;
