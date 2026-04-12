import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { readSarifFile } from "./run-semgrep.js";

describe("readSarifFile", () => {
  it("parses JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "asst-sg-"));
    const p = join(dir, "a.sarif");
    writeFileSync(p, '{"version":"2.1.0"}\n', "utf8");
    expect((readSarifFile(p) as { version: string }).version).toBe("2.1.0");
  });
});
