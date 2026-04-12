/**
 * P3 — Dependency supply chain: merged JSON from `pnpm audit` (and optional `cargo audit`).
 * Aligns with [.superstack/development-plan.md](../../../../.superstack/development-plan.md) P3.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export const SUPPLY_CHAIN_MERGED_V1 = "supply_chain_merged_v1" as const;

export type NpmAuditVulnerabilityCounts = {
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
};

export type SupplyChainMergedV1 = {
  schema_version: typeof SUPPLY_CHAIN_MERGED_V1;
  generated_at: string;
  npm?: {
    cwd: string;
    tool: "pnpm audit";
    exit_code: number;
    vulnerabilities: NpmAuditVulnerabilityCounts & { total?: number };
    total_dependencies?: number;
  };
  rust?: {
    cargo_audit?: {
      cwd: string;
      exit_code: number;
      vulnerabilities_found?: number;
    };
    status: "skipped" | "ok" | "error";
    reason?: string;
  };
};

function parsePnpmAuditJson(raw: string): {
  counts: NpmAuditVulnerabilityCounts & { total?: number };
  total_dependencies?: number;
} {
  const parsed = JSON.parse(raw) as {
    metadata?: {
      vulnerabilities?: Partial<NpmAuditVulnerabilityCounts> & { total?: number };
      totalDependencies?: number;
    };
  };
  const v = parsed.metadata?.vulnerabilities ?? {};
  const counts: NpmAuditVulnerabilityCounts & { total?: number } = {
    info: Number(v.info ?? 0),
    low: Number(v.low ?? 0),
    moderate: Number(v.moderate ?? 0),
    high: Number(v.high ?? 0),
    critical: Number(v.critical ?? 0),
  };
  if (typeof v.total === "number") counts.total = v.total;
  const total_dependencies = parsed.metadata?.totalDependencies;
  return { counts, total_dependencies };
}

export function resolveNpmProjectRoot(repoRoot: string): string | undefined {
  const direct = join(repoRoot, "pnpm-lock.yaml");
  if (existsSync(direct)) return repoRoot;
  const nested = join(repoRoot, "deepagentsjs", "pnpm-lock.yaml");
  if (existsSync(nested)) return join(repoRoot, "deepagentsjs");
  return undefined;
}

export function resolveCargoProjectRoot(repoRoot: string): string | undefined {
  if (existsSync(join(repoRoot, "Cargo.lock"))) return repoRoot;
  const nested = join(repoRoot, "deepagentsjs", "Cargo.lock");
  if (existsSync(nested)) return join(repoRoot, "deepagentsjs");
  return undefined;
}

export function runPnpmAuditJson(npmProjectRoot: string): {
  exit_code: number;
  stdout: string;
} {
  try {
    const stdout = execFileSync("pnpm", ["audit", "--json"], {
      cwd: npmProjectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exit_code: 0, stdout };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string | Buffer };
    const code = typeof e.status === "number" ? e.status : 1;
    const stdout =
      typeof e.stdout === "string"
        ? e.stdout
        : Buffer.isBuffer(e.stdout)
          ? e.stdout.toString("utf8")
          : "";
    return { exit_code: code, stdout };
  }
}

export function tryCargoAuditJson(cargoProjectRoot: string): {
  status: "ok" | "skipped" | "error";
  exit_code?: number;
  stdout?: string;
  reason?: string;
} {
  try {
    const stdout = execFileSync("cargo", ["audit", "--json"], {
      cwd: cargoProjectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
    return { status: "ok", exit_code: 0, stdout };
  } catch (err: unknown) {
    const e = err as {
      code?: string;
      status?: number;
      stdout?: string | Buffer;
      message?: string;
    };
    if (e.code === "ENOENT" || e.code === "ENOTDIR") {
      return {
        status: "skipped",
        reason: "cargo or cargo-audit not available",
      };
    }
    const code = typeof e.status === "number" ? e.status : 1;
    const stdout =
      typeof e.stdout === "string"
        ? e.stdout
        : Buffer.isBuffer(e.stdout)
          ? e.stdout.toString("utf8")
          : "";
    return { status: "ok", exit_code: code, stdout };
  }
}

export type CollectSupplyChainOptions = {
  repoRoot: string;
  includeRust?: boolean;
};

/**
 * Build merged supply-chain document + optional embedded summary for the manifest.
 */
export function collectSupplyChainMerged(
  options: CollectSupplyChainOptions,
): {
  merged: SupplyChainMergedV1;
  extraTools: Array<{ name: string; version: string; exit_code?: number }>;
} {
  const { repoRoot, includeRust = true } = options;
  const merged: SupplyChainMergedV1 = {
    schema_version: SUPPLY_CHAIN_MERGED_V1,
    generated_at: new Date().toISOString(),
  };
  const extraTools: Array<{ name: string; version: string; exit_code?: number }> =
    [];

  const npmRoot = resolveNpmProjectRoot(repoRoot);
  if (npmRoot) {
    const { exit_code, stdout } = runPnpmAuditJson(npmRoot);
    const { counts, total_dependencies } = parsePnpmAuditJson(stdout);
    merged.npm = {
      cwd: npmRoot,
      tool: "pnpm audit",
      exit_code,
      vulnerabilities: counts,
      ...(total_dependencies !== undefined
        ? { total_dependencies }
        : {}),
    };
    extraTools.push({
      name: "pnpm_audit",
      version: "pnpm audit --json",
      exit_code,
    });
  }

  if (includeRust) {
    const cargoRoot = resolveCargoProjectRoot(repoRoot);
    if (!cargoRoot) {
      merged.rust = { status: "skipped", reason: "no Cargo.lock under repo" };
    } else {
      const r = tryCargoAuditJson(cargoRoot);
      if (r.status === "skipped") {
        merged.rust = {
          status: "skipped",
          reason: r.reason ?? "cargo audit unavailable",
        };
      } else {
        const vf = countCargoAuditVulnerabilities(r.stdout);
        merged.rust = {
          status: "ok",
          cargo_audit: {
            cwd: cargoRoot,
            exit_code: r.exit_code ?? 0,
            ...(vf !== undefined ? { vulnerabilities_found: vf } : {}),
          },
        };
        extraTools.push({
          name: "cargo_audit",
          version: "cargo audit --json",
          exit_code: r.exit_code,
        });
      }
    }
  }

  return { merged, extraTools };
}

/** Best-effort count from `cargo audit --json` (format varies by rustsec/cargo-audit version). */
export function countCargoAuditVulnerabilities(rawJson: string | undefined): number | undefined {
  if (!rawJson) return undefined;
  try {
    const data = JSON.parse(rawJson) as unknown;
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (Array.isArray(o.vulnerabilities)) return o.vulnerabilities.length;
      if (Array.isArray(o.advisories)) return o.advisories.length;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export type ManifestSupplyChainSlice = {
  merged_json_sha256?: string;
  npm_audit_exit_code?: number;
  npm_vulnerabilities?: NpmAuditVulnerabilityCounts;
  rust?:
    | { status: "skipped"; reason: string }
    | {
        status: "ok";
        cargo_audit_exit_code?: number;
        vulnerabilities_found?: number;
      };
};

export function toManifestSupplyChain(
  merged: SupplyChainMergedV1,
  mergedJsonSha256?: string,
): ManifestSupplyChainSlice {
  const out: ManifestSupplyChainSlice = {};
  if (mergedJsonSha256) out.merged_json_sha256 = mergedJsonSha256;
  if (merged.npm) {
    out.npm_audit_exit_code = merged.npm.exit_code;
    out.npm_vulnerabilities = {
      info: merged.npm.vulnerabilities.info,
      low: merged.npm.vulnerabilities.low,
      moderate: merged.npm.vulnerabilities.moderate,
      high: merged.npm.vulnerabilities.high,
      critical: merged.npm.vulnerabilities.critical,
    };
  }
  if (merged.rust) {
    if (merged.rust.status === "skipped") {
      out.rust = {
        status: "skipped",
        reason: merged.rust.reason ?? "skipped",
      };
    } else if (merged.rust.cargo_audit) {
      out.rust = {
        status: "ok",
        cargo_audit_exit_code: merged.rust.cargo_audit.exit_code,
        ...(merged.rust.cargo_audit.vulnerabilities_found !== undefined
          ? { vulnerabilities_found: merged.rust.cargo_audit.vulnerabilities_found }
          : {}),
      };
    }
  }
  return out;
}
