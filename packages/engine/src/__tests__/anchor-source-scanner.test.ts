/**
 * Integration test for anchor_source_scanner — verifies the tool returns
 * a valid, structured ToolResult with the expected rule ids.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { anchorSourceScannerTool } from "../assurance-tools/anchor-source-scanner.js";
import { parseToolResult } from "../findings/index.js";

const VULN_RUST = `
use anchor_lang::prelude::*;

#[program]
pub mod example {
    use super::*;

    pub fn do_thing(ctx: Context<DoThing>, amount: u64) -> Result<()> {
        // TODO: add proper validation
        let balance = ctx.accounts.vault.balance;
        balance += amount;
        let _ = some_option.unwrap();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DoThing<'info> {
    pub authority: UncheckedAccount<'info>,
    pub payer: AccountInfo<'info>,
}
`;

function makeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "asst-anchor-"));
  const programDir = join(root, "programs", "example", "src");
  mkdirSync(programDir, { recursive: true });
  writeFileSync(join(programDir, "lib.rs"), VULN_RUST, "utf8");
  return root;
}

describe("anchor_source_scanner tool", () => {
  it("returns a structured ToolResult with findings", async () => {
    const root = makeFixture();
    const raw = await anchorSourceScannerTool.invoke({ projectPath: root });
    const result = parseToolResult(raw);
    assert.ok(result, "tool output must parse as ToolResult");
    assert.equal(result!.tool, "anchor_source_scanner");
    assert.equal(result!.status, "ok");
    assert.ok(result!.findings.length > 0);
  });

  it("detects the expected rules", async () => {
    const root = makeFixture();
    const raw = await anchorSourceScannerTool.invoke({ projectPath: root });
    const result = parseToolResult(raw)!;
    const ruleIds = new Set(result.findings.map((f) => f.ruleId));
    assert.ok(ruleIds.has("anchor.unchecked-account"), "should detect unchecked-account");
    assert.ok(ruleIds.has("anchor.raw-accountinfo"), "should detect raw-accountinfo");
    assert.ok(ruleIds.has("anchor.unwrap-usage"), "should detect unwrap-usage");
    assert.ok(ruleIds.has("anchor.todo-in-code"), "should detect todo-in-code");
  });

  it("findings are sorted by severity (highest first)", async () => {
    const root = makeFixture();
    const raw = await anchorSourceScannerTool.invoke({ projectPath: root });
    const result = parseToolResult(raw)!;
    const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    for (let i = 1; i < result.findings.length; i++) {
      const prev = SEV_ORDER[result.findings[i - 1].severity];
      const curr = SEV_ORDER[result.findings[i].severity];
      assert.ok(prev <= curr, "findings must be non-decreasing by severity");
    }
  });

  it("each finding carries rationale and source location", async () => {
    const root = makeFixture();
    const raw = await anchorSourceScannerTool.invoke({ projectPath: root });
    const result = parseToolResult(raw)!;
    for (const f of result.findings) {
      assert.ok(f.rationale, `finding ${f.ruleId} missing rationale`);
      assert.equal(f.location?.kind, "source");
      assert.ok(f.location?.file?.endsWith("lib.rs"));
      assert.ok(f.location?.startLine && f.location.startLine > 0);
    }
  });

  it("returns status=skipped when no .rs files exist", async () => {
    const root = mkdtempSync(join(tmpdir(), "asst-anchor-empty-"));
    const raw = await anchorSourceScannerTool.invoke({ projectPath: root });
    const result = parseToolResult(raw)!;
    assert.equal(result.status, "skipped");
    assert.equal(result.findings.length, 0);
  });
});
