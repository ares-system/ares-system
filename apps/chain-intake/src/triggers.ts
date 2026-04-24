/**
 * Chain-intake trigger classifier.
 *
 * Pure library: takes a Helius enhanced transaction (webhook element or
 * backfill row) and returns zero or more `ChainTrigger`s — compact,
 * structured anomaly signals that the assurance manifest writer can use
 * to decide whether a fresh scan is warranted.
 *
 * No database access, no I/O. Everything is synchronous and deterministic
 * so the same tx always produces the same triggers. Unit-tested against
 * synthetic Helius fixtures; see `src/__tests__/triggers.test.ts`.
 *
 * Rules (conservative — low false-positive rate matters more than recall):
 *
 *   1. program_upgrade           tx.type === "UPGRADE_PROGRAM_INSTRUCTION"
 *                                OR BPF Loader Upgradeable `Upgrade` ix.
 *   2. upgrade_authority_change  BPF Loader Upgradeable `SetAuthority` ix.
 *   3. mint_authority_change     SPL-Token `SetAuthority` ix w/ authority
 *                                type 0 (MintTokens).
 *   4. freeze_authority_change   SPL-Token `SetAuthority` ix w/ authority
 *                                type 1 (FreezeAccount).
 *   5. large_native_transfer     nativeTransfers[].amount ≥ threshold.
 *   6. large_token_transfer      tokenTransfers[].tokenAmount ≥ threshold.
 *
 * Each trigger carries a short `summary` plus a small JSON `evidence`
 * object so downstream tools can act without re-parsing the tx.
 */

// ─── Known program ids ──────────────────────────────────────────────

export const BPF_LOADER_UPGRADEABLE = "BPFLoaderUpgradeab1e11111111111111111111111";
export const SPL_TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const SPL_TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// BPF Loader Upgradeable instruction discriminators (little-endian u32)
export const BPF_UPGRADE_IX = 3;
export const BPF_SET_AUTHORITY_IX = 4;

// SPL Token instruction byte discriminators (single byte)
export const TOKEN_SET_AUTHORITY_IX = 6;

// AuthorityType values inside SetAuthority
export const AUTHORITY_TYPE_MINT = 0;
export const AUTHORITY_TYPE_FREEZE = 1;

// ─── Types ──────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ChainTriggerKind =
  | "program_upgrade"
  | "upgrade_authority_change"
  | "mint_authority_change"
  | "freeze_authority_change"
  | "large_native_transfer"
  | "large_token_transfer";

export interface ChainTrigger {
  signature: string;
  slot: number;
  kind: ChainTriggerKind;
  severity: Severity;
  /** Short human-readable description (one line). */
  summary: string;
  /** Small structured payload — rule-specific fields. */
  evidence: Record<string, unknown>;
}

// A conservative structural type for the fields we actually read. Helius
// Enhanced Tx has many more fields, but we only need these.
export interface HeliusEnhancedTxLike {
  signature?: string;
  slot?: number;
  type?: string;
  feePayer?: string;
  nativeTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    /** lamports */
    amount?: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    mint?: string;
    /** UI amount (already scaled by decimals). */
    tokenAmount?: number;
  }>;
  instructions?: Array<{
    programId?: string;
    /** base58 string (Helius default) — rare cases emit hex. */
    data?: string;
    accounts?: string[];
  }>;
}

// ─── Options ────────────────────────────────────────────────────────

export interface ClassifyOptions {
  /**
   * Threshold in lamports for `large_native_transfer`. Default 1_000 SOL
   * (1_000 * 1_000_000_000 = 1e12). Set to `Infinity` to disable.
   */
  largeNativeLamports?: number;
  /**
   * Threshold in UI tokens for `large_token_transfer`. Default 1_000_000.
   * Matches typical stablecoin "whale" thresholds but is intentionally
   * configurable per-deployment. Set to `Infinity` to disable.
   */
  largeTokenUiAmount?: number;
  /**
   * Optional list of watched addresses. When a trigger involves one of
   * these addresses, its severity is bumped by one level (e.g. high→critical).
   */
  watchAddresses?: string[];
}

const DEFAULT_LARGE_NATIVE_LAMPORTS = 1_000 * 1_000_000_000;
const DEFAULT_LARGE_TOKEN_UI_AMOUNT = 1_000_000;

// ─── Helpers ────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function bumpSeverity(s: Severity): Severity {
  switch (s) {
    case "info": return "low";
    case "low": return "medium";
    case "medium": return "high";
    case "high": return "critical";
    case "critical": return "critical";
  }
}

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_RANK[b] - SEVERITY_RANK[a];
}

export function maxSeverity(triggers: readonly ChainTrigger[]): Severity | undefined {
  if (triggers.length === 0) return undefined;
  return triggers.reduce<Severity>(
    (acc, t) => (SEVERITY_RANK[t.severity] > SEVERITY_RANK[acc] ? t.severity : acc),
    "info",
  );
}

function requireSigSlot(tx: HeliusEnhancedTxLike): { signature: string; slot: number } | undefined {
  const signature = typeof tx.signature === "string" ? tx.signature.trim() : "";
  const slot = typeof tx.slot === "number" && Number.isFinite(tx.slot) ? tx.slot : NaN;
  if (!signature || !Number.isFinite(slot)) return undefined;
  return { signature, slot };
}

/**
 * Decode a base58-encoded instruction-data string. Returns the raw bytes
 * or `undefined` if the string isn't base58 (which covers Helius edge
 * cases where data is hex or missing). Zero-dep so we don't pull in bs58.
 */
function decodeBase58(s: string): Uint8Array | undefined {
  const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const map = new Map<string, number>();
  for (let i = 0; i < ALPHA.length; i++) map.set(ALPHA[i]!, i);

  // Count leading '1's — each is a leading zero byte.
  let zeros = 0;
  while (zeros < s.length && s[zeros] === "1") zeros++;

  const size = Math.floor(((s.length - zeros) * Math.log(58)) / Math.log(256)) + 1;
  const out = new Uint8Array(size);
  let outLen = 0;

  for (let i = zeros; i < s.length; i++) {
    const v = map.get(s[i]!);
    if (v === undefined) return undefined; // not base58
    let carry = v;
    for (let j = size - 1; j >= 0; j--) {
      carry += out[j]! * 58;
      out[j] = carry & 0xff;
      carry >>= 8;
      if (j < size - outLen - 1 && carry === 0) break;
    }
    while (carry > 0) {
      outLen += 1;
      carry >>= 8;
    }
  }

  // trim leading zeros in the buffer, then prepend `zeros` true leading zeros
  let skip = 0;
  while (skip < size && out[skip] === 0) skip++;
  const result = new Uint8Array(zeros + (size - skip));
  for (let i = 0; i < zeros; i++) result[i] = 0;
  for (let i = 0; i < size - skip; i++) result[zeros + i] = out[skip + i]!;
  return result;
}

function firstU32LE(bytes: Uint8Array): number | undefined {
  if (bytes.length < 4) return undefined;
  return (bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24)) >>> 0;
}

// ─── Rule evaluators ────────────────────────────────────────────────

function ruleProgramUpgrade(
  tx: HeliusEnhancedTxLike,
  meta: { signature: string; slot: number },
): ChainTrigger[] {
  const out: ChainTrigger[] = [];

  // Path A: Helius explicit type.
  if (tx.type === "UPGRADE_PROGRAM_INSTRUCTION") {
    out.push({
      ...meta,
      kind: "program_upgrade",
      severity: "high",
      summary: `Program upgraded via BPF Loader (tx type ${tx.type}).`,
      evidence: {
        source: "helius_type",
        fee_payer: tx.feePayer,
      },
    });
    return out;
  }

  // Path B: BPF Loader Upgradeable instruction discriminator 3 (Upgrade).
  for (const ix of tx.instructions ?? []) {
    if (ix.programId !== BPF_LOADER_UPGRADEABLE) continue;
    const bytes = typeof ix.data === "string" ? decodeBase58(ix.data) : undefined;
    const disc = bytes ? firstU32LE(bytes) : undefined;
    if (disc === BPF_UPGRADE_IX) {
      out.push({
        ...meta,
        kind: "program_upgrade",
        severity: "high",
        summary: "Program upgraded via BPF Loader Upgradeable `Upgrade` instruction.",
        evidence: {
          source: "ix_discriminator",
          program_id: BPF_LOADER_UPGRADEABLE,
          accounts: ix.accounts ?? [],
        },
      });
    }
  }
  return out;
}

function ruleUpgradeAuthorityChange(
  tx: HeliusEnhancedTxLike,
  meta: { signature: string; slot: number },
): ChainTrigger[] {
  const out: ChainTrigger[] = [];
  for (const ix of tx.instructions ?? []) {
    if (ix.programId !== BPF_LOADER_UPGRADEABLE) continue;
    const bytes = typeof ix.data === "string" ? decodeBase58(ix.data) : undefined;
    const disc = bytes ? firstU32LE(bytes) : undefined;
    if (disc === BPF_SET_AUTHORITY_IX) {
      out.push({
        ...meta,
        kind: "upgrade_authority_change",
        severity: "critical",
        summary:
          "Upgrade authority changed (BPF Loader Upgradeable SetAuthority).",
        evidence: {
          program_id: BPF_LOADER_UPGRADEABLE,
          accounts: ix.accounts ?? [],
        },
      });
    }
  }
  return out;
}

function ruleTokenAuthorityChanges(
  tx: HeliusEnhancedTxLike,
  meta: { signature: string; slot: number },
): ChainTrigger[] {
  const out: ChainTrigger[] = [];
  for (const ix of tx.instructions ?? []) {
    if (ix.programId !== SPL_TOKEN && ix.programId !== SPL_TOKEN_2022) continue;
    const bytes = typeof ix.data === "string" ? decodeBase58(ix.data) : undefined;
    if (!bytes || bytes.length < 2) continue;
    if (bytes[0] !== TOKEN_SET_AUTHORITY_IX) continue;
    const authorityType = bytes[1];
    if (authorityType === AUTHORITY_TYPE_MINT) {
      out.push({
        ...meta,
        kind: "mint_authority_change",
        severity: "high",
        summary: "SPL Token mint authority changed via SetAuthority.",
        evidence: {
          program_id: ix.programId,
          authority_type: authorityType,
          accounts: ix.accounts ?? [],
        },
      });
    } else if (authorityType === AUTHORITY_TYPE_FREEZE) {
      out.push({
        ...meta,
        kind: "freeze_authority_change",
        severity: "high",
        summary: "SPL Token freeze authority changed via SetAuthority.",
        evidence: {
          program_id: ix.programId,
          authority_type: authorityType,
          accounts: ix.accounts ?? [],
        },
      });
    }
  }
  return out;
}

function ruleLargeNativeTransfer(
  tx: HeliusEnhancedTxLike,
  meta: { signature: string; slot: number },
  opts: Required<Pick<ClassifyOptions, "largeNativeLamports">>,
): ChainTrigger[] {
  const out: ChainTrigger[] = [];
  for (const nt of tx.nativeTransfers ?? []) {
    const amount = typeof nt.amount === "number" ? nt.amount : 0;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (amount < opts.largeNativeLamports) continue;
    out.push({
      ...meta,
      kind: "large_native_transfer",
      severity: "medium",
      summary: `Large native transfer: ${(amount / 1e9).toFixed(4)} SOL (${amount} lamports).`,
      evidence: {
        lamports: amount,
        sol: amount / 1e9,
        from: nt.fromUserAccount,
        to: nt.toUserAccount,
      },
    });
  }
  return out;
}

function ruleLargeTokenTransfer(
  tx: HeliusEnhancedTxLike,
  meta: { signature: string; slot: number },
  opts: Required<Pick<ClassifyOptions, "largeTokenUiAmount">>,
): ChainTrigger[] {
  const out: ChainTrigger[] = [];
  for (const tt of tx.tokenTransfers ?? []) {
    const amount = typeof tt.tokenAmount === "number" ? tt.tokenAmount : 0;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (amount < opts.largeTokenUiAmount) continue;
    out.push({
      ...meta,
      kind: "large_token_transfer",
      severity: "medium",
      summary: `Large token transfer: ${amount} of mint ${tt.mint ?? "unknown"}.`,
      evidence: {
        token_amount: amount,
        mint: tt.mint,
        from: tt.fromUserAccount,
        to: tt.toUserAccount,
      },
    });
  }
  return out;
}

// ─── Entry point ────────────────────────────────────────────────────

export function classifyHeliusTransaction(
  tx: HeliusEnhancedTxLike,
  opts: ClassifyOptions = {},
): ChainTrigger[] {
  const meta = requireSigSlot(tx);
  if (!meta) return [];

  const watch = new Set(opts.watchAddresses ?? []);
  const largeNativeLamports =
    opts.largeNativeLamports ?? DEFAULT_LARGE_NATIVE_LAMPORTS;
  const largeTokenUiAmount =
    opts.largeTokenUiAmount ?? DEFAULT_LARGE_TOKEN_UI_AMOUNT;

  const rawTriggers: ChainTrigger[] = [
    ...ruleProgramUpgrade(tx, meta),
    ...ruleUpgradeAuthorityChange(tx, meta),
    ...ruleTokenAuthorityChanges(tx, meta),
    ...ruleLargeNativeTransfer(tx, meta, { largeNativeLamports }),
    ...ruleLargeTokenTransfer(tx, meta, { largeTokenUiAmount }),
  ];

  // Bump severity when a watched address is involved (fee payer or any
  // transfer/ix participant).
  if (watch.size > 0) {
    const involved = collectInvolvedAddresses(tx);
    const watchHit = Array.from(watch).some((a) => involved.has(a));
    if (watchHit) {
      for (const t of rawTriggers) {
        t.evidence = { ...t.evidence, watched: true };
        t.severity = bumpSeverity(t.severity);
      }
    }
  }

  // Deduplicate identical (kind) triggers — some txs have repeated ix of the
  // same type and we only want one per (sig, kind) to match the DB PK.
  const seen = new Set<ChainTriggerKind>();
  const deduped: ChainTrigger[] = [];
  for (const t of rawTriggers) {
    if (seen.has(t.kind)) continue;
    seen.add(t.kind);
    deduped.push(t);
  }
  return deduped;
}

function collectInvolvedAddresses(tx: HeliusEnhancedTxLike): Set<string> {
  const out = new Set<string>();
  if (tx.feePayer) out.add(tx.feePayer);
  for (const nt of tx.nativeTransfers ?? []) {
    if (nt.fromUserAccount) out.add(nt.fromUserAccount);
    if (nt.toUserAccount) out.add(nt.toUserAccount);
  }
  for (const tt of tx.tokenTransfers ?? []) {
    if (tt.fromUserAccount) out.add(tt.fromUserAccount);
    if (tt.toUserAccount) out.add(tt.toUserAccount);
  }
  for (const ix of tx.instructions ?? []) {
    for (const a of ix.accounts ?? []) out.add(a);
    if (ix.programId) out.add(ix.programId);
  }
  return out;
}

// ─── Aggregation helpers ────────────────────────────────────────────

export interface TriggerCounts {
  total: number;
  by_kind: Partial<Record<ChainTriggerKind, number>>;
  by_severity: Partial<Record<Severity, number>>;
}

export function summarizeTriggers(triggers: readonly ChainTrigger[]): TriggerCounts {
  const by_kind: Partial<Record<ChainTriggerKind, number>> = {};
  const by_severity: Partial<Record<Severity, number>> = {};
  for (const t of triggers) {
    by_kind[t.kind] = (by_kind[t.kind] ?? 0) + 1;
    by_severity[t.severity] = (by_severity[t.severity] ?? 0) + 1;
  }
  return { total: triggers.length, by_kind, by_severity };
}

export const __internal = { decodeBase58, firstU32LE };
