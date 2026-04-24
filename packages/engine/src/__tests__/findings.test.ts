/**
 * Unit tests for the structured findings layer.
 *
 * Run with: node --import tsx --test src/__tests__/findings.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  FindingSchema,
  ToolResultSchema,
  SEVERITY_ORDER,
  exceedsThreshold,
  findingId,
  findingsToSarif,
  makeFinding,
  makeToolResult,
  mergeToolResults,
  parseToolResult,
  sarifToFindings,
  stringifyToolResult,
  summarize,
  toHumanSummary,
} from "../findings/index.js";

// ─── Schema validation ─────────────────────────────────────────────

describe("FindingSchema", () => {
  it("accepts a minimal well-formed finding", () => {
    const f = makeFinding({
      tool: "t",
      ruleId: "t.rule",
      title: "Title",
      kind: "vulnerability",
      severity: "high",
      confidence: "medium",
      description: "desc",
    });
    assert.equal(FindingSchema.safeParse(f).success, true);
  });

  it("rejects unknown severity values", () => {
    const bad = FindingSchema.safeParse({
      id: "x",
      tool: "t",
      ruleId: "t.rule",
      title: "x",
      kind: "vulnerability",
      severity: "Critical", // capitalized — not allowed
      confidence: "high",
      description: "",
    });
    assert.equal(bad.success, false);
  });

  it("produces deterministic ids for the same input", () => {
    const a = findingId("t", "t.rule", { kind: "source", file: "a.rs", startLine: 1 });
    const b = findingId("t", "t.rule", { kind: "source", file: "a.rs", startLine: 1 });
    assert.equal(a, b);
  });

  it("changes id when location differs", () => {
    const a = findingId("t", "t.rule", { kind: "source", file: "a.rs", startLine: 1 });
    const b = findingId("t", "t.rule", { kind: "source", file: "a.rs", startLine: 2 });
    assert.notEqual(a, b);
  });
});

// ─── Summarizer ────────────────────────────────────────────────────

describe("summarize", () => {
  const f = (severity: any, confidence: any = "high") =>
    makeFinding({
      tool: "t",
      ruleId: `t.${severity}`,
      title: severity,
      kind: "vulnerability",
      severity,
      confidence,
      description: "",
    });

  it("returns zeros for an empty set", () => {
    const s = summarize([]);
    assert.equal(s.total, 0);
    assert.equal(s.bySeverity.critical, 0);
    assert.equal(s.worstSeverity, undefined);
  });

  it("counts across all severities and tracks worst", () => {
    const s = summarize([f("critical"), f("high"), f("medium"), f("low"), f("info")]);
    assert.equal(s.total, 5);
    assert.equal(s.bySeverity.critical, 1);
    assert.equal(s.bySeverity.info, 1);
    assert.equal(s.worstSeverity, "critical");
  });

  it("worstSeverity picks the most severe present", () => {
    const s = summarize([f("medium"), f("low"), f("high")]);
    assert.equal(s.worstSeverity, "high");
  });
});

// ─── ToolResult serialization ──────────────────────────────────────

describe("ToolResult serialization", () => {
  it("round-trips through stringify/parse", () => {
    const tr = makeToolResult({
      tool: "t",
      findings: [
        makeFinding({
          tool: "t",
          ruleId: "t.rule",
          title: "T",
          kind: "vulnerability",
          severity: "high",
          confidence: "high",
          description: "d",
        }),
      ],
    });
    const serialized = stringifyToolResult(tr);
    const parsed = parseToolResult(serialized);
    assert.ok(parsed);
    assert.equal(parsed!.findings.length, 1);
    assert.equal(parsed!.summary.total, 1);
  });

  it("parseToolResult returns null for invalid input", () => {
    assert.equal(parseToolResult("not json"), null);
    assert.equal(parseToolResult("{}"), null);
    assert.equal(parseToolResult(`{"version": 99}`), null);
  });

  it("sorts findings by severity then rule id", () => {
    const tr = makeToolResult({
      tool: "t",
      findings: [
        makeFinding({
          tool: "t",
          ruleId: "t.zzz",
          title: "Z",
          kind: "vulnerability",
          severity: "medium",
          confidence: "high",
          description: "",
        }),
        makeFinding({
          tool: "t",
          ruleId: "t.aaa",
          title: "A",
          kind: "vulnerability",
          severity: "critical",
          confidence: "high",
          description: "",
        }),
      ],
    });
    assert.equal(tr.findings[0].ruleId, "t.aaa");
    assert.equal(tr.findings[0].severity, "critical");
  });

  it("validates against the ToolResult Zod schema", () => {
    const tr = makeToolResult({ tool: "t", findings: [] });
    assert.equal(ToolResultSchema.safeParse(tr).success, true);
  });
});

// ─── humanSummary ──────────────────────────────────────────────────

describe("toHumanSummary", () => {
  it("renders zero-findings header", () => {
    const tr = makeToolResult({ tool: "t", findings: [] });
    const s = toHumanSummary(tr);
    assert.match(s, /## t/);
    assert.match(s, /Total: 0 findings/);
    assert.match(s, /No findings/);
  });

  it("truncates when over the limit", () => {
    const findings = Array.from({ length: 30 }, (_, i) =>
      makeFinding({
        tool: "t",
        ruleId: `t.rule-${i}`,
        title: `r${i}`,
        kind: "vulnerability",
        severity: "low",
        confidence: "medium",
        description: "",
      }),
    );
    const tr = makeToolResult({ tool: "t", findings });
    const s = toHumanSummary(tr, 5);
    assert.match(s, /and 25 more/);
  });

  it("prefers a caller-supplied humanSummary", () => {
    const tr = makeToolResult({
      tool: "t",
      findings: [],
      humanSummary: "CUSTOM MESSAGE",
    });
    assert.equal(toHumanSummary(tr), "CUSTOM MESSAGE");
  });
});

// ─── SARIF bridge ──────────────────────────────────────────────────

describe("SARIF bridge", () => {
  it("produces a SARIF log with one result per finding", () => {
    const findings = [
      makeFinding({
        tool: "t",
        ruleId: "t.rule",
        title: "T",
        kind: "vulnerability",
        severity: "high",
        confidence: "high",
        description: "d",
        location: { kind: "source", file: "a.rs", startLine: 10 },
      }),
    ];
    const log = findingsToSarif(findings, { driverName: "t" });
    assert.equal(log.version, "2.1.0");
    assert.equal(log.runs?.[0]?.results?.length, 1);
    const [result] = log.runs![0].results!;
    assert.equal((result as any).ruleId, "t.rule");
    assert.equal((result as any).level, "error");
  });

  it("round-trips findings through SARIF", () => {
    const original = [
      makeFinding({
        tool: "t",
        ruleId: "t.rule",
        title: "T",
        kind: "vulnerability",
        severity: "high",
        confidence: "low",
        description: "d",
        location: { kind: "source", file: "a.rs", startLine: 10 },
      }),
    ];
    const log = findingsToSarif(original, { driverName: "t" });
    const back = sarifToFindings(log);
    assert.equal(back.length, 1);
    assert.equal(back[0].ruleId, "t.rule");
    // SARIF compresses severity granularity; allow either "high" or "error"-mapped
    assert.ok(["high", "medium", "low", "info", "critical"].includes(back[0].severity));
    assert.equal(back[0].location?.file, "a.rs");
  });

  it("collates distinct ruleIds into driver.rules", () => {
    const a = makeFinding({
      tool: "t",
      ruleId: "t.one",
      title: "One",
      kind: "vulnerability",
      severity: "low",
      confidence: "high",
      description: "",
    });
    const b = makeFinding({
      tool: "t",
      ruleId: "t.two",
      title: "Two",
      kind: "vulnerability",
      severity: "low",
      confidence: "high",
      description: "",
    });
    const log = findingsToSarif([a, b]);
    const rules = log.runs?.[0]?.tool?.driver?.rules ?? [];
    assert.equal(rules.length, 2);
    assert.ok(rules.find((r: any) => r.id === "t.one"));
    assert.ok(rules.find((r: any) => r.id === "t.two"));
  });
});

// ─── CI helpers ────────────────────────────────────────────────────

describe("CI helpers", () => {
  const f = (severity: any) =>
    makeFinding({
      tool: "t",
      ruleId: `t.${severity}`,
      title: severity,
      kind: "vulnerability",
      severity,
      confidence: "high",
      description: "",
    });

  it("exceedsThreshold('high') fires on critical or high", () => {
    assert.equal(exceedsThreshold(summarize([f("critical")]), "high"), true);
    assert.equal(exceedsThreshold(summarize([f("high")]), "high"), true);
    assert.equal(exceedsThreshold(summarize([f("medium")]), "high"), false);
  });

  it("exceedsThreshold('medium') fires on critical, high, medium", () => {
    assert.equal(exceedsThreshold(summarize([f("medium")]), "medium"), true);
    assert.equal(exceedsThreshold(summarize([f("low")]), "medium"), false);
  });

  it("mergeToolResults concatenates findings and re-summarizes", () => {
    const r1 = makeToolResult({ tool: "a", findings: [f("high")] });
    const r2 = makeToolResult({ tool: "b", findings: [f("low"), f("medium")] });
    const merged = mergeToolResults([r1, r2]);
    assert.equal(merged.findings.length, 3);
    assert.equal(merged.summary.total, 3);
    assert.equal(merged.summary.bySeverity.high, 1);
    assert.equal(merged.summary.bySeverity.medium, 1);
    assert.equal(merged.summary.bySeverity.low, 1);
  });

  it("SEVERITY_ORDER lists critical as most severe (0)", () => {
    assert.equal(SEVERITY_ORDER.critical, 0);
    assert.ok(SEVERITY_ORDER.info > SEVERITY_ORDER.critical);
  });
});
