/**
 * Constructors, summarizers, and (de)serializers for findings.
 *
 * All runtime code that produces or consumes findings should go through
 * these helpers rather than building objects by hand. Benefits:
 *   - Consistent id generation (stable per-(file,line,rule) hash).
 *   - Zod-validated output — bad shapes fail fast during dev.
 *   - One summarize() implementation everyone agrees on.
 */
import { createHash } from "node:crypto";

import {
  FindingSchema,
  FindingSummarySchema,
  ToolResultSchema,
  TOOL_RESULT_VERSION,
  SEVERITY_ORDER,
  type Finding,
  type FindingKind,
  type FindingLocation,
  type FindingSummary,
  type Severity,
  type Confidence,
  type ToolResult,
  type ToolResultStatus,
} from "./schema.js";

// ─── Id generation ──────────────────────────────────────────────────

/**
 * Deterministic id from tool + rule + location. Same inputs always yield
 * the same id so findings dedup cleanly across runs and tools.
 */
export function findingId(
  tool: string,
  ruleId: string,
  location?: FindingLocation,
): string {
  const parts = [
    tool,
    ruleId,
    location?.file ?? "",
    location?.startLine ?? "",
    location?.programId ?? "",
    location?.mint ?? "",
    location?.txSignature ?? "",
  ];
  const h = createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
  return `${tool}:${ruleId}:${h}`;
}

// ─── Finding builder ────────────────────────────────────────────────

export interface MakeFindingInput {
  tool: string;
  ruleId: string;
  title: string;
  kind: FindingKind;
  severity: Severity;
  confidence: Confidence;
  description: string;
  rationale?: string;
  remediation?: string;
  references?: string[];
  tags?: string[];
  location?: FindingLocation;
  meta?: Record<string, unknown>;
  /** Override the generated id. Use sparingly. */
  id?: string;
}

export function makeFinding(input: MakeFindingInput): Finding {
  const candidate: Finding = {
    id: input.id ?? findingId(input.tool, input.ruleId, input.location),
    tool: input.tool,
    ruleId: input.ruleId,
    title: input.title,
    kind: input.kind,
    severity: input.severity,
    confidence: input.confidence,
    description: input.description,
    rationale: input.rationale,
    remediation: input.remediation,
    references: input.references,
    tags: input.tags,
    location: input.location,
    createdAt: new Date().toISOString(),
    meta: input.meta,
  };
  return FindingSchema.parse(candidate);
}

// ─── Summarizer ─────────────────────────────────────────────────────

/**
 * Reduce a list of findings into a summary. `filesScanned` is an optional
 * caller-supplied hint (tools know their scope better than we do).
 */
export function summarize(
  findings: Finding[],
  opts: { filesScanned?: number } = {},
): FindingSummary {
  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  const byConfidence = { high: 0, medium: 0, low: 0 };
  const byKind: Partial<Record<FindingKind, number>> = {};

  let worstIdx = SEVERITY_ORDER.info;
  for (const f of findings) {
    bySeverity[f.severity] += 1;
    byConfidence[f.confidence] += 1;
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
    if (SEVERITY_ORDER[f.severity] < worstIdx) {
      worstIdx = SEVERITY_ORDER[f.severity];
    }
  }

  const worstSeverity =
    findings.length === 0
      ? undefined
      : (Object.keys(SEVERITY_ORDER) as Severity[]).find(
          (s) => SEVERITY_ORDER[s] === worstIdx,
        );

  return FindingSummarySchema.parse({
    total: findings.length,
    bySeverity,
    byConfidence,
    byKind: byKind as Record<string, number>,
    filesScanned: opts.filesScanned,
    worstSeverity,
  });
}

// ─── ToolResult builder ─────────────────────────────────────────────

export interface MakeToolResultInput {
  tool: string;
  status?: ToolResultStatus;
  findings: Finding[];
  humanSummary?: string;
  error?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
  filesScanned?: number;
}

export function makeToolResult(input: MakeToolResultInput): ToolResult {
  const sorted = [...input.findings].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.ruleId.localeCompare(b.ruleId),
  );
  const result: ToolResult = {
    version: TOOL_RESULT_VERSION,
    tool: input.tool,
    status: input.status ?? (input.error ? "error" : "ok"),
    findings: sorted,
    summary: summarize(sorted, { filesScanned: input.filesScanned }),
    humanSummary: input.humanSummary,
    error: input.error,
    durationMs: input.durationMs,
    meta: input.meta,
  };
  return ToolResultSchema.parse(result);
}

// ─── Serialization ──────────────────────────────────────────────────

/**
 * Stringify a ToolResult for transport (tool return, JSON file, db blob).
 * We emit compact JSON; pretty-printing is the consumer's problem.
 */
export function stringifyToolResult(result: ToolResult): string {
  return JSON.stringify(ToolResultSchema.parse(result));
}

/**
 * Parse + validate a ToolResult from a JSON string.
 * Returns `null` if the input isn't a valid ToolResult.
 */
export function parseToolResult(raw: unknown): ToolResult | null {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return ToolResultSchema.parse(parsed);
  } catch {
    return null;
  }
}

// ─── Pretty-print ───────────────────────────────────────────────────

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: "CRIT",
  high: "HIGH",
  medium: " MED",
  low: " LOW",
  info: "INFO",
};

/**
 * Short human-readable rendering suitable for agent tool output.
 *
 * - Always lists the top 20 findings by severity.
 * - Prefers caller-provided `humanSummary` if present.
 */
export function toHumanSummary(result: ToolResult, limit = 20): string {
  if (result.humanSummary) return result.humanSummary;

  const head = [
    `## ${result.tool} — status: ${result.status}`,
    `Total: ${result.summary.total} findings  `
      + `(crit=${result.summary.bySeverity.critical}  `
      + `high=${result.summary.bySeverity.high}  `
      + `med=${result.summary.bySeverity.medium}  `
      + `low=${result.summary.bySeverity.low}  `
      + `info=${result.summary.bySeverity.info})`,
  ];
  if (result.error) head.push(`error: ${result.error}`);

  if (result.findings.length === 0) {
    head.push("No findings.");
    return head.join("\n");
  }

  const rows = result.findings.slice(0, limit).map((f) => {
    const loc = locationOneLiner(f.location);
    const conf = `${f.confidence[0].toUpperCase()}conf`;
    return `- [${SEVERITY_BADGE[f.severity]}|${conf}] ${f.ruleId} — ${f.title}${loc}`;
  });

  if (result.findings.length > limit) {
    rows.push(`…and ${result.findings.length - limit} more.`);
  }

  return [...head, "", ...rows].join("\n");
}

function locationOneLiner(loc: FindingLocation | undefined): string {
  if (!loc) return "";
  if (loc.kind === "source" && loc.file) {
    return ` @ ${loc.file}${loc.startLine ? `:${loc.startLine}` : ""}`;
  }
  if (loc.kind === "chain") {
    if (loc.programId) return ` @ program ${shorten(loc.programId)}`;
    if (loc.mint) return ` @ mint ${shorten(loc.mint)}`;
    if (loc.txSignature) return ` @ tx ${shorten(loc.txSignature)}`;
  }
  if (loc.kind === "artifact" && loc.file) return ` @ ${loc.file}`;
  if (loc.kind === "config" && loc.file) return ` @ ${loc.file}`;
  return "";
}

function shorten(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

// ─── CI helpers ─────────────────────────────────────────────────────

/**
 * Merge multiple ToolResults into a single bag. Useful for CI aggregators
 * and the unified posture report.
 */
export function mergeToolResults(results: ToolResult[]): {
  findings: Finding[];
  summary: FindingSummary;
} {
  const findings = results.flatMap((r) => r.findings);
  return { findings, summary: summarize(findings) };
}

/**
 * Returns true if the summary meets the gating threshold.
 * Default: fail when any `high` or `critical` finding exists.
 */
export function exceedsThreshold(
  summary: FindingSummary,
  threshold: Severity = "high",
): boolean {
  const cutoff = SEVERITY_ORDER[threshold];
  return (
    (cutoff >= SEVERITY_ORDER.critical && summary.bySeverity.critical > 0) ||
    (cutoff >= SEVERITY_ORDER.high && summary.bySeverity.high > 0) ||
    (cutoff >= SEVERITY_ORDER.medium && summary.bySeverity.medium > 0) ||
    (cutoff >= SEVERITY_ORDER.low && summary.bySeverity.low > 0) ||
    (cutoff >= SEVERITY_ORDER.info && summary.bySeverity.info > 0)
  );
}
