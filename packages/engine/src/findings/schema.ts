/**
 * Canonical Zod schema for assurance findings.
 *
 * Every assurance tool that produces findings should return a `ToolResult`
 * so downstream consumers (dashboard, CI gate, SARIF export, report
 * synthesizer) don't have to parse free-text.
 *
 * Design notes:
 *  - Severities are lowercase enums; we used to have a mix of "Critical"
 *    and "critical" across tools. Pick one: lowercase, matches SARIF.
 *  - Every finding carries `confidence` because many tools are heuristic.
 *    Treat `confidence` as independent from `severity`.
 *  - `kind` keeps the taxonomy flat — 6 buckets is enough; avoid 50.
 *  - `location.kind` lets us point at source, chain state, artifact file,
 *    or config without a discriminated union per tool.
 *  - `meta` is intentionally open so tools can stash tool-specific detail
 *    without breaking the schema; stable fields move out of `meta` later.
 */
import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────

export const SeverityEnum = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export type Severity = z.infer<typeof SeverityEnum>;

export const ConfidenceEnum = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceEnum>;

/**
 * Broad taxonomy of what a finding *is*. Kept deliberately small.
 */
export const FindingKindEnum = z.enum([
  "vulnerability", //    exploitable code-level bug
  "risk", //             risky pattern (centralization, concentration, CPI)
  "misconfiguration", // infra / env hygiene
  "secret-exposure", //  leaked credential
  "policy-violation", // org-level rule failure
  "info", //             observation, not an issue
]);
export type FindingKind = z.infer<typeof FindingKindEnum>;

/**
 * How the location is addressed. Most code findings are `source`; on-chain
 * findings use `chain`; things produced by earlier tools (SARIF, snapshots)
 * use `artifact`; config-file findings use `config`.
 */
export const LocationKindEnum = z.enum([
  "source",
  "chain",
  "artifact",
  "config",
]);
export type LocationKind = z.infer<typeof LocationKindEnum>;

// ─── Sub-schemas ────────────────────────────────────────────────────

export const FindingLocationSchema = z
  .object({
    kind: LocationKindEnum,
    file: z.string().optional(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    startColumn: z.number().int().positive().optional(),
    endColumn: z.number().int().positive().optional(),
    snippet: z.string().optional(),

    // On-chain locators
    programId: z.string().optional(),
    mint: z.string().optional(),
    account: z.string().optional(),
    txSignature: z.string().optional(),
    slot: z.number().int().nonnegative().optional(),

    // External locators
    url: z.string().url().optional(),
  })
  .passthrough();
export type FindingLocation = z.infer<typeof FindingLocationSchema>;

// ─── Finding ────────────────────────────────────────────────────────

export const FindingSchema = z.object({
  /** Stable id within a tool run. Usually `${tool}:${ruleId}:${hash}`. */
  id: z.string().min(1),

  /** Emitting tool (e.g. "anchor_source_scanner"). */
  tool: z.string().min(1),

  /**
   * Namespaced rule id (e.g. "anchor.unchecked-account",
   * "secret.openai-key", "env-hygiene.missing-gitignore-env").
   * Lowercase, dot-separated; used for SARIF rule collation + CI allowlists.
   */
  ruleId: z.string().min(1),

  title: z.string().min(1),

  kind: FindingKindEnum,
  severity: SeverityEnum,
  confidence: ConfidenceEnum,

  description: z.string(),
  rationale: z.string().optional(),
  remediation: z.string().optional(),
  references: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  location: FindingLocationSchema.optional(),

  createdAt: z.string().datetime().optional(),

  /** Open bag for tool-specific extras that haven't earned a top-level field. */
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ─── Summary ────────────────────────────────────────────────────────

export const FindingSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  bySeverity: z.object({
    critical: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    info: z.number().int().nonnegative(),
  }),
  byConfidence: z
    .object({
      high: z.number().int().nonnegative(),
      medium: z.number().int().nonnegative(),
      low: z.number().int().nonnegative(),
    })
    .optional(),
  // Partial map — keys are FindingKind strings; only present kinds are populated.
  byKind: z.record(z.string(), z.number().int().nonnegative()).optional(),
  filesScanned: z.number().int().nonnegative().optional(),
  worstSeverity: SeverityEnum.optional(),
});
export type FindingSummary = z.infer<typeof FindingSummarySchema>;

// ─── Tool result envelope ───────────────────────────────────────────

export const TOOL_RESULT_VERSION = 1 as const;

export const ToolResultStatusEnum = z.enum([
  "ok",
  "partial", // completed but not everything ran (e.g. semgrep binary missing)
  "error",
  "skipped",
]);
export type ToolResultStatus = z.infer<typeof ToolResultStatusEnum>;

export const ToolResultSchema = z.object({
  version: z.literal(TOOL_RESULT_VERSION),
  tool: z.string().min(1),
  status: ToolResultStatusEnum,

  findings: z.array(FindingSchema),
  summary: FindingSummarySchema,

  /** Pre-rendered text returned to the LLM (may be the same as the tool's content). */
  humanSummary: z.string().optional(),

  /** Present when `status === "error"`. */
  error: z.string().optional(),

  /** Wall-clock duration of the tool run, in milliseconds. */
  durationMs: z.number().int().nonnegative().optional(),

  /** Tool-specific payload (e.g. token-concentration metrics). */
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

// ─── Severity ordering (shared) ─────────────────────────────────────

/** Lower index = more severe. Useful for sorting + "worst of" reductions. */
export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/** Default severity exit-code mapping for CI gates. */
export const SEVERITY_EXIT_CODE: Record<Severity, number> = {
  critical: 10,
  high: 8,
  medium: 4,
  low: 2,
  info: 0,
};
