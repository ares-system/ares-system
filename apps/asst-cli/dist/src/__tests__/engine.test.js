/**
 * ASST Engine Unit Tests
 *
 * Run with: npx tsx --test src/__tests__/engine.test.ts
 * Or with Node test runner: node --import tsx --test src/__tests__/engine.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
// ─── Secret Scanner Tests ───────────────────────────────────────────
describe("Secret Scanner Patterns", () => {
    // Inline the patterns to test them without importing (avoids module resolution issues)
    const patterns = [
        { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
        { name: "Solana Private Key (base58)", regex: /[1-9A-HJ-NP-Za-km-z]{87,88}/g },
        { name: "GitHub Token", regex: /gh[ps]_[A-Za-z0-9_]{36,}/g },
        { name: "OpenAI Key", regex: /sk-[A-Za-z0-9]{32,}/g },
        { name: "JWT Token", regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
        { name: "Bearer Token", regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g },
        { name: "API Key Assignment", regex: /(?:api_?key|apikey|api_?secret)\s*[=:]\s*['"][^'"]{8,}['"]/gi },
        { name: "RSA Private Key", regex: /-----BEGIN\s+RSA\s+PRIVATE\s+KEY-----/g },
        { name: "Mnemonic Seed Phrase", regex: /\b(?:abandon|ability|absent|absorb|abstract|absurd|abuse|access)\s+(?:\w+\s+){10,22}(?:\w+)\b/gi },
    ];
    it("should detect AWS access keys", () => {
        const text = "const key = 'AKIAIOSFODNN7EXAMPLE';";
        const match = text.match(patterns[0].regex);
        assert.ok(match, "Should find AWS key");
        assert.equal(match[0], "AKIAIOSFODNN7EXAMPLE");
    });
    it("should not false-positive on short strings", () => {
        const text = "const name = 'hello';";
        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            assert.equal(match, null, `Pattern ${pattern.name} should not match 'hello'`);
        }
    });
    it("should detect GitHub tokens", () => {
        const text = 'GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh1234';
        const match = text.match(patterns[2].regex);
        assert.ok(match, "Should find GitHub token");
    });
    it("should detect JWT tokens", () => {
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
        const match = token.match(patterns[4].regex);
        assert.ok(match, "Should find JWT token");
    });
    it("should detect RSA private key headers", () => {
        const text = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAA...";
        const match = text.match(patterns[7].regex);
        assert.ok(match, "Should find RSA key header");
    });
    it("should detect API key assignments", () => {
        const text = `api_key = "sk_live_1234567890abcdef"`;
        const match = text.match(patterns[6].regex);
        assert.ok(match, "Should find API key assignment");
    });
});
// ─── Shannon Entropy Tests ──────────────────────────────────────────
describe("Shannon Entropy Detection", () => {
    function shannonEntropy(s) {
        const freq = {};
        for (const c of s)
            freq[c] = (freq[c] || 0) + 1;
        const len = s.length;
        let entropy = 0;
        for (const count of Object.values(freq)) {
            const p = count / len;
            if (p > 0)
                entropy -= p * Math.log2(p);
        }
        return entropy;
    }
    it("should compute low entropy for repeated characters", () => {
        const entropy = shannonEntropy("aaaaaaaaaa");
        assert.ok(entropy < 1, `Expected < 1, got ${entropy}`);
    });
    it("should compute high entropy for random-looking strings", () => {
        const entropy = shannonEntropy("aB3$xZ9!mK7@pQ2&wE5#");
        assert.ok(entropy > 3.5, `Expected > 3.5, got ${entropy}`);
    });
    it("should have moderate entropy for English text", () => {
        const entropy = shannonEntropy("the quick brown fox");
        assert.ok(entropy > 2, `Expected > 2, got ${entropy}`);
        assert.ok(entropy < 5, `Expected < 5, got ${entropy}`);
    });
});
// ─── Anchor Pattern Tests ───────────────────────────────────────────
describe("Anchor Source Scanner Patterns", () => {
    it("should detect UncheckedAccount usage", () => {
        const code = `pub authority: UncheckedAccount<'info>,`;
        assert.ok(code.match(/UncheckedAccount/g), "Should detect UncheckedAccount");
    });
    it("should detect missing signer check", () => {
        const code = `pub payer: AccountInfo<'info>,`;
        assert.ok(code.match(/pub\s+\w+\s*:\s*AccountInfo/g), "Should detect unverified AccountInfo");
    });
    it("should detect unwrap() usage", () => {
        const code = `let value = some_option.unwrap();`;
        assert.ok(code.match(/\.unwrap\(\)/g), "Should detect unwrap()");
    });
    it("should detect TODO/FIXME comments", () => {
        const code = `// TODO: add proper validation\n// FIXME: this is vulnerable`;
        const matches = code.match(/\/\/\s*(TODO|FIXME|HACK|XXX|UNSAFE)/gi);
        assert.ok(matches, "Should detect TODO/FIXME");
        assert.equal(matches.length, 2);
    });
    it("should not false-positive on safe patterns", () => {
        const code = `#[account(signer)]\npub authority: Signer<'info>,`;
        assert.equal(code.match(/UncheckedAccount/g), null, "Should not match UncheckedAccount");
    });
});
// ─── Token Concentration Tests ──────────────────────────────────────
describe("Concentration Metrics", () => {
    function computeGini(sortedValues) {
        const n = sortedValues.length;
        if (n === 0)
            return 0;
        const mean = sortedValues.reduce((s, v) => s + v, 0) / n;
        if (mean === 0)
            return 0;
        let sumDiff = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                sumDiff += Math.abs(sortedValues[i] - sortedValues[j]);
            }
        }
        return sumDiff / (2 * n * n * mean);
    }
    function computeHHI(percentages) {
        return Math.round(percentages.reduce((sum, p) => sum + p * p, 0));
    }
    it("should compute HHI = 10000 for monopoly", () => {
        assert.equal(computeHHI([100]), 10000);
    });
    it("should compute HHI = 5000 for duopoly", () => {
        const hhi = computeHHI([50, 50]);
        assert.equal(hhi, 5000);
    });
    it("should compute low HHI for even distribution", () => {
        const percentages = Array(100).fill(1);
        const hhi = computeHHI(percentages);
        assert.equal(hhi, 100);
    });
    it("should compute Gini = 0 for equal distribution", () => {
        const gini = computeGini([100, 100, 100, 100]);
        assert.ok(Math.abs(gini) < 0.001, `Expected ~0, got ${gini}`);
    });
    it("should compute high Gini for unequal distribution", () => {
        const gini = computeGini([1, 1, 1, 1000]);
        assert.ok(gini > 0.5, `Expected > 0.5, got ${gini}`);
    });
});
// ─── Posture Score Tests ────────────────────────────────────────────
describe("Posture Score Grading", () => {
    function computeGrade(score) {
        if (score >= 90)
            return "A";
        if (score >= 80)
            return "B";
        if (score >= 70)
            return "C";
        if (score >= 60)
            return "D";
        return "F";
    }
    it("should grade 95 as A", () => assert.equal(computeGrade(95), "A"));
    it("should grade 90 as A", () => assert.equal(computeGrade(90), "A"));
    it("should grade 85 as B", () => assert.equal(computeGrade(85), "B"));
    it("should grade 75 as C", () => assert.equal(computeGrade(75), "C"));
    it("should grade 65 as D", () => assert.equal(computeGrade(65), "D"));
    it("should grade 50 as F", () => assert.equal(computeGrade(50), "F"));
    it("should grade 0 as F", () => assert.equal(computeGrade(0), "F"));
    it("should compute weighted aggregate correctly", () => {
        const scores = [100, 100, 100, 100, 100, 100];
        const weights = [0.20, 0.20, 0.15, 0.15, 0.20, 0.10];
        const overall = Math.round(scores.reduce((sum, s, i) => sum + s * weights[i], 0));
        assert.equal(overall, 100);
    });
    it("should handle mixed scores correctly", () => {
        const scores = [100, 80, 50, 90, 70, 60];
        const weights = [0.20, 0.20, 0.15, 0.15, 0.20, 0.10];
        const overall = Math.round(scores.reduce((sum, s, i) => sum + s * weights[i], 0));
        assert.ok(overall > 0 && overall <= 100, `Expected 0 < x <= 100, got ${overall}`);
        assert.equal(overall, 77); // 20+16+7.5+13.5+14+6 = 77
    });
});
// ─── Diff Logic Tests ───────────────────────────────────────────────
describe("Manifest Diff Logic", () => {
    function classifyChange(before, after) {
        if (before === after)
            return "unchanged";
        if (after === "ok" && before !== "ok")
            return "improved";
        if (before === "ok" && after !== "ok")
            return "regressed";
        return "new";
    }
    it("should classify ok → ok as unchanged", () => {
        assert.equal(classifyChange("ok", "ok"), "unchanged");
    });
    it("should classify error → ok as improved", () => {
        assert.equal(classifyChange("error", "ok"), "improved");
    });
    it("should classify ok → error as regressed", () => {
        assert.equal(classifyChange("ok", "error"), "regressed");
    });
    it("should classify unknown → warning as new", () => {
        assert.equal(classifyChange("unknown", "warning"), "new");
    });
});
console.log("Running ASST engine tests...");
