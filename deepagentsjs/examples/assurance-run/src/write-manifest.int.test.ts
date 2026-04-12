import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("write-run-manifest integration", () => {
  it(
    "emits manifest JSON with --no-supply-chain --no-static-analysis",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "asst-wm-"));
      try {
        const deepagentsRoot = join(
          dirname(fileURLToPath(import.meta.url)),
          "..",
          "..",
          "..",
        );
        const repoRoot = join(deepagentsRoot, "..");
        await execFileAsync(
          "pnpm",
          [
            "exec",
            "tsx",
            "examples/assurance-run/write-run-manifest.ts",
            "--cwd",
            repoRoot,
            "--out",
            join(dir, "assurance"),
            "--no-supply-chain",
            "--no-static-analysis",
            "--notes",
            "integration-test",
          ],
          {
            cwd: deepagentsRoot,
            maxBuffer: 20 * 1024 * 1024,
          },
        );
        const outDir = join(dir, "assurance");
        const files = readdirSync(outDir).filter((n) => n.startsWith("run-"));
        expect(files.length).toBeGreaterThan(0);
        const latest = files.sort().at(-1)!;
        const raw = JSON.parse(
          readFileSync(join(outDir, latest), "utf8"),
        ) as { schema_version?: string };
        expect(raw.schema_version).toBe("assurance_run_manifest_v1");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
