/**
 * Assurance Run manifest v1 — commit-bound evidence bundle metadata.
 * Aligns with ASST [.superstack/development-plan.md](../../../../.superstack/development-plan.md) P0.
 */
import { z } from "zod";

export const ASSURANCE_RUN_MANIFEST_V1 = "assurance_run_manifest_v1" as const;

export const toolRecordSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  exit_code: z.number().int().optional(),
});

const npmVulnSummarySchema = z.object({
  info: z.number().int(),
  low: z.number().int(),
  moderate: z.number().int(),
  high: z.number().int(),
  critical: z.number().int(),
});

const supplyChainSchema = z.object({
  /** SHA-256 of `supply-chain-merged.json` when P3 lane runs */
  merged_json_sha256: z.string().optional(),
  npm_audit_exit_code: z.number().int().optional(),
  npm_vulnerabilities: npmVulnSummarySchema.optional(),
  rust: z
    .union([
      z.object({
        status: z.literal("skipped"),
        reason: z.string(),
      }),
      z.object({
        status: z.literal("ok"),
        cargo_audit_exit_code: z.number().int().optional(),
        vulnerabilities_found: z.number().int().optional(),
      }),
    ])
    .optional(),
});

/** P2 — Semgrep / SARIF lane */
const staticAnalysisSchema = z.object({
  semgrep: z
    .union([
      z.object({
        status: z.literal("skipped"),
        reason: z.string(),
      }),
      z.object({
        status: z.literal("ok"),
        exit_code: z.number().int(),
      }),
    ])
    .optional(),
});

/** Chain-intake trigger kinds — mirrors apps/chain-intake/src/triggers.ts. */
const chainTriggerKindSchema = z.enum([
  "program_upgrade",
  "upgrade_authority_change",
  "mint_authority_change",
  "freeze_authority_change",
  "large_native_transfer",
  "large_token_transfer",
]);

const chainTriggerSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

const chainTriggerCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  by_kind: z.record(z.string(), z.number().int().nonnegative()).optional(),
  by_severity: z.record(z.string(), z.number().int().nonnegative()).optional(),
});

/** Optional — merged parsed on-chain evidence (pipeline output), not raw RPC blobs */
const chainIntelligenceSchema = z
  .object({
    status: z.enum(["skipped", "ok", "partial"]),
    ingestion_method: z
      .enum(["webhook", "websocket", "geyser", "rpc-polling"])
      .optional(),
    evidence_bundle_sha256: z.string().min(1).optional(),
    /** Evidence bundle schema_version as emitted by chain-intake. */
    evidence_schema_version: z.string().optional(),
    /** Number of transactions covered by the bundle (informational). */
    transaction_count: z.number().int().nonnegative().optional(),
    /** Derived anomaly counts from chain-intake's classifier. */
    trigger_counts: chainTriggerCountsSchema.optional(),
    /** Highest severity across all detected triggers. */
    trigger_max_severity: chainTriggerSeveritySchema.nullable().optional(),
    /** Known trigger kinds observed — kept separately for cheap filtering in CI. */
    trigger_kinds: z.array(chainTriggerKindSchema).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) =>
      d.status !== "ok" ||
      (d.evidence_bundle_sha256 != null && d.evidence_bundle_sha256.length > 0),
    {
      message:
        "chain_intelligence with status ok requires evidence_bundle_sha256",
    },
  );

export const assuranceRunManifestV1Schema = z.object({
  schema_version: z.literal(ASSURANCE_RUN_MANIFEST_V1),
  generated_at: z.string(),
  git: z.object({
    commit_sha: z.string().min(7),
    ref: z.string().optional(),
    dirty: z.boolean(),
  }),
  tools: z.array(toolRecordSchema),
  artifact_hashes: z
    .object({
      merged_json_sha256: z.string().optional(),
      /** P2 — SHA-256 of merged SARIF (e.g. `findings-merged.sarif.json`) */
      merged_sarif_sha256: z.string().optional(),
      lockfiles: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  /** P3 — dependency supply chain (advisory summary + hash of merged JSON) */
  supply_chain: supplyChainSchema.optional(),
  /** P2 — static analysis (Semgrep SARIF lane) */
  static_analysis: staticAnalysisSchema.optional(),
  /** Optional — Solana pipeline / on-chain intelligence bundle (hash of merged JSON) */
  chain_intelligence: chainIntelligenceSchema.optional(),
  notes: z.string().optional(),
});

export type AssuranceRunManifestV1 = z.infer<
  typeof assuranceRunManifestV1Schema
>;

export function parseAssuranceRunManifestV1(
  data: unknown,
): AssuranceRunManifestV1 {
  return assuranceRunManifestV1Schema.parse(data);
}
