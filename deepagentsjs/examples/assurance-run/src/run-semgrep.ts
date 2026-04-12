import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type RunSemgrepResult =
  | {
      status: "ok";
      exitCode: number;
      sarifPath: string;
      version: string;
    }
  | {
      status: "skipped";
      reason: string;
    };

function semgrepVersion(): string | undefined {
  try {
    const out = execFileSync("semgrep", ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim().split("\n")[0] ?? "semgrep";
  } catch {
    return undefined;
  }
}

/**
 * Run Semgrep with SARIF output to `outDir/semgrep.sarif`. Returns skipped if binary missing.
 * `cwd` is the scan root (e.g. repo root or `deepagentsjs/` only for faster CI).
 */
export function runSemgrepScan(options: {
  cwd: string;
  outDir: string;
  /** Default: `auto` ruleset */
  config?: string;
  /** Paths relative to `cwd` to pass to Semgrep (default: `[\".\"]`). */
  scanPaths?: string[];
}): RunSemgrepResult {
  const { cwd, outDir, config = "auto", scanPaths = ["."] } = options;
  const ver = semgrepVersion();
  if (!ver) {
    return { status: "skipped", reason: "semgrep not found in PATH" };
  }

  const sarifPath = join(outDir, "semgrep.sarif");
  let exitCode = 0;
  try {
    execFileSync(
      "semgrep",
      ["scan", "--config", config, "--sarif", "--output", sarifPath, ...scanPaths],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (err: unknown) {
    const e = err as { status?: number };
    exitCode = typeof e.status === "number" ? e.status : 1;
  }

  if (!existsSync(sarifPath)) {
    writeFileSync(
      sarifPath,
      JSON.stringify(
        {
          version: "2.1.0",
          runs: [
            {
              tool: { driver: { name: "semgrep", rules: [] } },
              results: [],
            },
          ],
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
  }

  return { status: "ok", exitCode, sarifPath, version: ver };
}

export function readSarifFile(path: string): unknown {
  const text = readFileSync(path, "utf8");
  return JSON.parse(text) as unknown;
}
