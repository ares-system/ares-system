/**
 * Engine factory for the Next.js web surface.
 *
 * The web app is **public** (or will be), so by default it must not expose
 * tools that can mutate the filesystem or spawn subprocesses.
 *
 * All API routes should call `createPublicOrchestrator()` rather than
 * instantiating `Orchestrator` directly, so security policy lives in one
 * place.
 *
 * Environment:
 *   ASST_WEB_ALLOW_WRITE — explicit opt-in to mount mutating tools on the
 *                          web surface. Default: disabled.
 *   ASST_ORCHESTRATOR_MODEL — e.g. "google:gemini-2.5-flash",
 *                          "ollama:llama3.1". Defaults resolved inside the
 *                          engine.
 */
import { Orchestrator } from "@ares/engine";

export interface PublicOrchestratorOptions {
  repoRoot?: string;
  model?: string;
}

export function createPublicOrchestrator(opts: PublicOrchestratorOptions = {}) {
  const repoRoot = opts.repoRoot ?? process.cwd();

  // Block mutating tools unless explicitly enabled for this host.
  if (process.env.ASST_WEB_ALLOW_WRITE !== "1") {
    process.env.ASST_ALLOW_WRITE = "0";
    // Ensure any legacy global permission hook denies by default on web.
    (globalThis as any).ARES_ASK_PERMISSION = async (msg: string) => {
      console.warn("[ARES web] Denied tool execution by default:", msg);
      return false;
    };
  }

  return new Orchestrator(repoRoot, { model: opts.model });
}
