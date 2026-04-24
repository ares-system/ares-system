/**
 * Finding <-> SARIF 2.1.0 conversion.
 *
 * SARIF is the de-facto handoff format for static-analysis findings to
 * GitHub code-scanning, Sonar, and similar systems. Having a first-class
 * bridge means every tool in the engine gets SARIF export for free.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */
import type { SarifLog, SarifResult, SarifRule } from "../assurance-tools/merge-sarif.js";
import {
  FindingSchema,
  SEVERITY_ORDER,
  type Finding,
  type Severity,
} from "./schema.js";
import { findingId } from "./helpers.js";

const SCHEMA_URL =
  "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json";

// ─── Severity mapping ───────────────────────────────────────────────

/** Severity -> SARIF `level`. SARIF only has 4 levels (+ "none"). */
function toSarifLevel(sev: Severity): "error" | "warning" | "note" | "none" {
  switch (sev) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
      return "note";
    case "info":
    default:
      return "none";
  }
}

/** SARIF `level` -> internal severity (lossy; medium/low collapse). */
function fromSarifLevel(level: string | undefined): Severity {
  switch (level) {
    case "error":
      return "high";
    case "warning":
      return "medium";
    case "note":
      return "low";
    default:
      return "info";
  }
}

/** GitHub-compatible security-severity (0.0–10.0) hint in `properties`. */
function toSecuritySeverity(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "9.5";
    case "high":
      return "7.5";
    case "medium":
      return "5.0";
    case "low":
      return "3.0";
    case "info":
    default:
      return "1.0";
  }
}

// ─── Finding -> SARIF result ────────────────────────────────────────

export interface FindingsToSarifOpts {
  /** Driver name emitted in `tool.driver.name`. Default: "asst-engine". */
  driverName?: string;
  driverVersion?: string;
  /** Absolute repo root. If given, file uris are made repo-relative. */
  repoRoot?: string;
}

export function findingsToSarif(
  findings: Finding[],
  opts: FindingsToSarifOpts = {},
): SarifLog {
  const ruleMap = new Map<string, SarifRule>();
  const results: SarifResult[] = [];

  for (const f of findings) {
    if (!ruleMap.has(f.ruleId)) {
      ruleMap.set(f.ruleId, {
        id: f.ruleId,
        name: f.ruleId,
        shortDescription: { text: f.title },
        fullDescription: { text: f.description },
        help: {
          text: [f.rationale, f.remediation].filter(Boolean).join("\n\n") || f.description,
        },
        defaultConfiguration: { level: toSarifLevel(f.severity) },
        properties: {
          "security-severity": toSecuritySeverity(f.severity),
          tags: [f.kind, ...(f.tags ?? [])],
        },
      });
    }

    const loc = f.location;
    const locations = [];
    if (loc?.file) {
      const uri = loc.file; // we trust callers to pass repo-relative; don't silently rewrite
      locations.push({
        physicalLocation: {
          artifactLocation: { uri, uriBaseId: "%SRCROOT%" },
          region:
            loc.startLine || loc.endLine
              ? {
                  startLine: loc.startLine ?? undefined,
                  endLine: loc.endLine ?? undefined,
                  startColumn: loc.startColumn ?? undefined,
                  endColumn: loc.endColumn ?? undefined,
                  snippet: loc.snippet ? { text: loc.snippet } : undefined,
                }
              : undefined,
        },
      });
    }

    results.push({
      ruleId: f.ruleId,
      level: toSarifLevel(f.severity),
      message: {
        text: [f.title, f.description].filter(Boolean).join(" — "),
      },
      locations: locations.length > 0 ? locations : undefined,
      properties: {
        tool: f.tool,
        confidence: f.confidence,
        kind: f.kind,
        ...(f.meta ?? {}),
      },
      fingerprints: { asstFindingId: f.id },
    });
  }

  return {
    version: "2.1.0",
    $schema: SCHEMA_URL,
    runs: [
      {
        tool: {
          driver: {
            name: opts.driverName ?? "asst-engine",
            version: opts.driverVersion,
            rules: [...ruleMap.values()],
            informationUri: "https://github.com/asst/ares",
          },
        },
        originalUriBaseIds: opts.repoRoot
          ? { "%SRCROOT%": { uri: toFileUri(opts.repoRoot) } }
          : undefined,
        results,
      },
    ],
  };
}

// ─── SARIF result -> Finding ────────────────────────────────────────

/**
 * Best-effort reverse conversion. Used when ingesting third-party SARIF
 * (Semgrep output, GitHub code-scanning, etc.) into the unified finding
 * pipeline. Confidence defaults to "medium" because SARIF has no field
 * for it; raise/lower in a post-processing step if the producer is known.
 */
export function sarifToFindings(
  log: SarifLog,
  opts: { tool?: string } = {},
): Finding[] {
  const out: Finding[] = [];
  for (const run of log.runs ?? []) {
    const driverName = (run.tool?.driver?.name as string | undefined) ?? opts.tool ?? "sarif";
    const ruleIndex = new Map<string, SarifRule>();
    for (const r of run.tool?.driver?.rules ?? []) {
      if (typeof r.id === "string") ruleIndex.set(r.id, r);
    }

    for (const res of run.results ?? []) {
      const ruleId =
        (res.ruleId as string | undefined) ||
        ((res as any).rule?.id as string | undefined) ||
        "unknown";
      const rule = ruleIndex.get(ruleId);

      const level = (res as any).level as string | undefined;
      const severity = fromSarifLevel(level);

      const firstLoc = ((res as any).locations ?? [])[0];
      const phys = firstLoc?.physicalLocation;
      const file = phys?.artifactLocation?.uri as string | undefined;
      const region = phys?.region;

      const location = file
        ? {
            kind: "source" as const,
            file,
            startLine: region?.startLine,
            endLine: region?.endLine,
            startColumn: region?.startColumn,
            endColumn: region?.endColumn,
            snippet: region?.snippet?.text,
          }
        : undefined;

      const title =
        ((rule as any)?.shortDescription?.text as string | undefined) ??
        ((res as any).message?.text as string | undefined) ??
        ruleId;
      const description =
        ((rule as any)?.fullDescription?.text as string | undefined) ??
        ((res as any).message?.text as string | undefined) ??
        "";

      const confidence =
        (((res as any).properties?.confidence as string | undefined) as
          | "high"
          | "medium"
          | "low"
          | undefined) ?? "medium";

      const candidate = {
        id:
          ((res as any).fingerprints?.asstFindingId as string | undefined) ??
          findingId(driverName, ruleId, location),
        tool: driverName,
        ruleId,
        title,
        kind: (((res as any).properties?.kind as string) ?? "vulnerability") as Finding["kind"],
        severity,
        confidence,
        description,
        location,
        meta: (res as any).properties,
        createdAt: new Date().toISOString(),
      } as Finding;

      const parsed = FindingSchema.safeParse(candidate);
      if (parsed.success) out.push(parsed.data);
    }
  }
  return out;
}

// ─── Helpers ────────────────────────────────────────────────────────

function toFileUri(path: string): string {
  const norm = path.replace(/\\/g, "/");
  if (norm.startsWith("file:")) return norm;
  return /^[A-Za-z]:\//.test(norm) ? `file:///${norm}` : `file://${norm}`;
}

/** Stable sort by severity then rule id — the order we want in dashboards. */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.ruleId.localeCompare(b.ruleId) ||
      a.id.localeCompare(b.id),
  );
}
