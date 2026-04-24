/**
 * Unit tests for the chain-intake trigger classifier.
 *
 * Uses synthetic Helius-shaped fixtures. No DB, no network — the classifier
 * is a pure function.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  classifyHeliusTransaction,
  summarizeTriggers,
  maxSeverity,
  compareSeverity,
  BPF_LOADER_UPGRADEABLE,
  SPL_TOKEN,
  __internal,
  type HeliusEnhancedTxLike,
} from "../triggers.js";

// ─── Fixtures ───────────────────────────────────────────────────────

const BASE: HeliusEnhancedTxLike = {
  signature: "5t".padEnd(88, "a"),
  slot: 123_456_789,
};

function bs58(bytes: number[]): string {
  const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const src = new Uint8Array(bytes);
  let zeros = 0;
  while (zeros < src.length && src[zeros] === 0) zeros++;
  // base58 encode
  const digits: number[] = [];
  for (let i = zeros; i < src.length; i++) {
    let carry = src[i]!;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! * 256;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHA[digits[i]!];
  return out || "1";
}

// ─── Base58 decoder sanity ──────────────────────────────────────────
// (Exhaustive rule tests below exercise the production decoder; this just
//  pins a couple of hand-checked vectors.)

describe("internal base58 decoder", () => {
  it("decodes known short vectors correctly", () => {
    // "11111111111111111111111111111112" is the System Program id (all
    // zeros plus a trailing 2). Just confirm the decoder returns a
    // Uint8Array of the right length for the well-known case.
    const decoded = __internal.decodeBase58("11111111111111111111111111111112");
    assert.ok(decoded, "decoder should accept valid base58");
    assert.equal(decoded!.length, 32, "Solana pubkeys are 32 bytes");
  });

  it("returns undefined for non-base58 characters", () => {
    assert.equal(__internal.decodeBase58("not-base58-0I"), undefined);
  });
});

// ─── Severity helpers ───────────────────────────────────────────────

describe("severity helpers", () => {
  it("compareSeverity orders descending", () => {
    const ranked = (["info", "critical", "low", "high", "medium"] as const)
      .slice()
      .sort(compareSeverity);
    assert.deepEqual(ranked, ["critical", "high", "medium", "low", "info"]);
  });

  it("maxSeverity picks the worst across triggers", () => {
    const triggers = [
      { signature: "s", slot: 1, kind: "large_native_transfer" as const, severity: "medium" as const, summary: "", evidence: {} },
      { signature: "s", slot: 1, kind: "program_upgrade" as const, severity: "high" as const, summary: "", evidence: {} },
    ];
    assert.equal(maxSeverity(triggers), "high");
    assert.equal(maxSeverity([]), undefined);
  });
});

// ─── Classifier rules ───────────────────────────────────────────────

describe("program_upgrade rule", () => {
  it("fires on explicit Helius tx type", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      type: "UPGRADE_PROGRAM_INSTRUCTION",
      feePayer: "Dep1oyer1111111111111111111111111111111111",
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0]!.kind, "program_upgrade");
    assert.equal(triggers[0]!.severity, "high");
    assert.equal((triggers[0]!.evidence as any).source, "helius_type");
  });

  it("fires on BPF Loader Upgradeable ix with discriminator 3", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      instructions: [
        {
          programId: BPF_LOADER_UPGRADEABLE,
          data: bs58([3, 0, 0, 0]), // u32 LE = 3 (Upgrade)
          accounts: ["ProgramBufferAcc", "Target1111111111111111111111111111111111"],
        },
      ],
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0]!.kind, "program_upgrade");
    assert.equal((triggers[0]!.evidence as any).source, "ix_discriminator");
  });

  it("does NOT fire on unrelated BPF Loader ix (e.g. Write = 2)", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      instructions: [
        {
          programId: BPF_LOADER_UPGRADEABLE,
          data: bs58([2, 0, 0, 0]), // Write
          accounts: ["buf"],
        },
      ],
    };
    assert.equal(classifyHeliusTransaction(tx).length, 0);
  });
});

describe("upgrade_authority_change rule", () => {
  it("fires on BPF Loader SetAuthority (disc=4)", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      instructions: [
        {
          programId: BPF_LOADER_UPGRADEABLE,
          data: bs58([4, 0, 0, 0]),
          accounts: ["ProgramDataAcc", "NewAuth111"],
        },
      ],
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0]!.kind, "upgrade_authority_change");
    assert.equal(triggers[0]!.severity, "critical");
  });
});

describe("mint_authority_change rule", () => {
  it("fires on SPL Token SetAuthority with authority_type=0 (Mint)", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      instructions: [
        {
          programId: SPL_TOKEN,
          data: bs58([6, 0]), // SetAuthority, type=MintTokens
          accounts: ["MintAcc", "NewAuth"],
        },
      ],
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0]!.kind, "mint_authority_change");
    assert.equal(triggers[0]!.severity, "high");
  });

  it("does NOT fire on SetAuthority w/ non-mint/freeze type (e.g. AccountOwner)", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      instructions: [
        {
          programId: SPL_TOKEN,
          data: bs58([6, 2]), // AccountOwner
          accounts: ["Acc"],
        },
      ],
    };
    assert.deepEqual(classifyHeliusTransaction(tx), []);
  });
});

describe("freeze_authority_change rule", () => {
  it("fires on SPL Token SetAuthority with authority_type=1 (Freeze)", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      instructions: [
        {
          programId: SPL_TOKEN,
          data: bs58([6, 1]),
          accounts: ["MintAcc", "NewFreezeAuth"],
        },
      ],
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0]!.kind, "freeze_authority_change");
  });
});

describe("large_native_transfer rule", () => {
  it("fires when amount >= threshold", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      nativeTransfers: [
        { fromUserAccount: "A", toUserAccount: "B", amount: 2_000 * 1e9 },
      ],
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0]!.kind, "large_native_transfer");
    assert.equal((triggers[0]!.evidence as any).sol, 2000);
  });

  it("respects custom threshold", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      nativeTransfers: [
        { fromUserAccount: "A", toUserAccount: "B", amount: 5 * 1e9 },
      ],
    };
    assert.equal(classifyHeliusTransaction(tx).length, 0, "below default");
    const triggered = classifyHeliusTransaction(tx, { largeNativeLamports: 1 * 1e9 });
    assert.equal(triggered.length, 1);
  });

  it("does NOT fire on small transfers", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      nativeTransfers: [
        { fromUserAccount: "A", toUserAccount: "B", amount: 1_000_000 },
      ],
    };
    assert.equal(classifyHeliusTransaction(tx).length, 0);
  });
});

describe("large_token_transfer rule", () => {
  it("fires when tokenAmount >= threshold", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      tokenTransfers: [
        {
          fromUserAccount: "A",
          toUserAccount: "B",
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          tokenAmount: 2_500_000,
        },
      ],
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0]!.kind, "large_token_transfer");
  });

  it("does NOT fire on small transfers", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      tokenTransfers: [
        {
          fromUserAccount: "A",
          toUserAccount: "B",
          mint: "SomeMint",
          tokenAmount: 100,
        },
      ],
    };
    assert.equal(classifyHeliusTransaction(tx).length, 0);
  });
});

// ─── Negatives ──────────────────────────────────────────────────────

describe("benign transactions", () => {
  it("yields nothing for a plain small SPL transfer", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      type: "TRANSFER",
      tokenTransfers: [
        {
          fromUserAccount: "A",
          toUserAccount: "B",
          mint: "SomeMint",
          tokenAmount: 1.5,
        },
      ],
    };
    assert.deepEqual(classifyHeliusTransaction(tx), []);
  });

  it("yields nothing for tx missing signature/slot", () => {
    const tx: HeliusEnhancedTxLike = {
      type: "UPGRADE_PROGRAM_INSTRUCTION",
    };
    assert.deepEqual(classifyHeliusTransaction(tx), []);
  });
});

// ─── Severity bump on watched address ───────────────────────────────

describe("watchAddresses severity bump", () => {
  it("bumps severity when the watched address is involved", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      type: "UPGRADE_PROGRAM_INSTRUCTION",
      feePayer: "WatchedProgramDeployer",
    };
    const baseline = classifyHeliusTransaction(tx);
    assert.equal(baseline[0]!.severity, "high");
    const watched = classifyHeliusTransaction(tx, {
      watchAddresses: ["WatchedProgramDeployer"],
    });
    assert.equal(watched[0]!.severity, "critical");
    assert.equal((watched[0]!.evidence as any).watched, true);
  });

  it("does NOT bump when watched address is unrelated", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      type: "UPGRADE_PROGRAM_INSTRUCTION",
      feePayer: "OtherDeployer",
    };
    const triggers = classifyHeliusTransaction(tx, {
      watchAddresses: ["SomeoneElse"],
    });
    assert.equal(triggers[0]!.severity, "high");
  });
});

// ─── Dedup + summarize ──────────────────────────────────────────────

describe("deduplication", () => {
  it("collapses repeated rule hits into one trigger per kind per tx", () => {
    const tx: HeliusEnhancedTxLike = {
      ...BASE,
      nativeTransfers: [
        { fromUserAccount: "A", toUserAccount: "B", amount: 2_000 * 1e9 },
        { fromUserAccount: "C", toUserAccount: "D", amount: 3_000 * 1e9 },
      ],
    };
    const triggers = classifyHeliusTransaction(tx);
    assert.equal(triggers.length, 1, "one trigger per (sig, kind)");
  });
});

describe("summarizeTriggers", () => {
  it("counts by kind and severity", () => {
    const triggers = [
      { signature: "s", slot: 1, kind: "program_upgrade" as const, severity: "high" as const, summary: "", evidence: {} },
      { signature: "s2", slot: 2, kind: "large_native_transfer" as const, severity: "medium" as const, summary: "", evidence: {} },
      { signature: "s3", slot: 3, kind: "large_native_transfer" as const, severity: "medium" as const, summary: "", evidence: {} },
    ];
    const sum = summarizeTriggers(triggers);
    assert.equal(sum.total, 3);
    assert.equal(sum.by_kind.program_upgrade, 1);
    assert.equal(sum.by_kind.large_native_transfer, 2);
    assert.equal(sum.by_severity.high, 1);
    assert.equal(sum.by_severity.medium, 2);
  });
});
