import { execFileSync } from "node:child_process";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
const schema = z.object({
    cwd: z.string().describe("Repository root to scan"),
});
// ─── Comprehensive Secret Patterns ─────────────────────────────────────
const SECRET_PATTERNS = [
    // Cloud Providers
    { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
    { name: "AWS Secret Key", regex: /(?:aws_secret_access_key|AWS_SECRET)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i },
    { name: "Google API Key", regex: /AIzaSy[A-Za-z0-9_-]{33}/ },
    { name: "Google OAuth", regex: /[0-9]+-[a-z0-9_]{32}\.apps\.googleusercontent\.com/ },
    // LLM & AI Providers
    { name: "OpenAI Key", regex: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/ },
    { name: "OpenRouter Key", regex: /sk-or-v1-[a-f0-9]{64}/ },
    { name: "Anthropic Key", regex: /sk-ant-[A-Za-z0-9-]{95}/ },
    // Solana / Crypto
    { name: "Solana Private Key (base58 88-char)", regex: /[1-9A-HJ-NP-Za-km-z]{87,88}/ },
    { name: "Solana Keypair JSON", regex: /\[\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*\d{1,3}){27,}/ },
    { name: "Mnemonic Seed Phrase", regex: /(?:abandon|ability|able|about|above|absent)\s+(?:\w+\s+){10,22}(?:\w+)/ },
    { name: "Helius API Key", regex: /helius.*api[_-]?key/i },
    { name: "Alchemy API Key", regex: /(?:alchemy|ALCHEMY).*(?:key|KEY)\s*[:=]\s*['"]?[A-Za-z0-9_-]{32}/ },
    // VCS & DevOps
    { name: "GitHub Token", regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
    { name: "GitLab Token", regex: /glpat-[A-Za-z0-9\-_]{20,}/ },
    { name: "npm Token", regex: /npm_[A-Za-z0-9]{36}/ },
    // Communication
    { name: "Slack Token", regex: /xox[bporas]-[0-9]{10,}-[A-Za-z0-9]{10,}/ },
    { name: "Discord Token", regex: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}/ },
    { name: "Telegram Bot Token", regex: /\d{8,10}:[A-Za-z0-9_-]{35}/ },
    // Cryptographic Material
    { name: "RSA Private Key", regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
    { name: "OpenSSH Private Key", regex: /-----BEGIN OPENSSH PRIVATE KEY-----/ },
    { name: "PGP Private Key", regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/ },
    { name: "JWT Token", regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
    // Generic Patterns
    { name: "Generic API Key Assignment", regex: /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"][A-Za-z0-9_\-/.+]{20,}['"]/i },
    { name: "Generic Password Assignment", regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i },
    { name: "Bearer Token", regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i },
];
/**
 * Calculate Shannon entropy to detect high-entropy strings that may be secrets.
 */
function shannonEntropy(str) {
    const freq = new Map();
    for (const ch of str) {
        freq.set(ch, (freq.get(ch) || 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
        const p = count / str.length;
        if (p > 0)
            entropy -= p * Math.log2(p);
    }
    return entropy;
}
export const secretScannerTool = tool(async (input) => {
    try {
        const cwd = input.cwd && input.cwd.trim() !== "" ? input.cwd : process.cwd();
        const cleanEnv = { ...process.env };
        Object.keys(cleanEnv).forEach(k => k.startsWith("GIT_") && delete cleanEnv[k]);
        const output = execFileSync("git", ["log", "--diff-filter=A", "-p"], {
            cwd,
            env: cleanEnv,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024
        });
        const secrets = [];
        const seenFindings = new Set();
        const lines = output.split('\n');
        lines.forEach((line, i) => {
            if (!line.startsWith('+'))
                return; // only care about additions
            const cleanLine = line.slice(1); // remove leading '+'
            // Pattern-based detection
            SECRET_PATTERNS.forEach(p => {
                if (p.regex.test(cleanLine)) {
                    const key = `${p.name}:${i}`;
                    if (!seenFindings.has(key)) {
                        seenFindings.add(key);
                        secrets.push(`[PATTERN] ${p.name} — line ~${i}: ${cleanLine.substring(0, 80).trim()}...`);
                    }
                }
            });
            // Entropy-based detection for long alphanumeric strings (potential secrets)
            const highEntropyMatches = cleanLine.match(/[A-Za-z0-9+/=_-]{40,}/g);
            if (highEntropyMatches) {
                highEntropyMatches.forEach(match => {
                    const entropy = shannonEntropy(match);
                    if (entropy > 4.5 && match.length >= 40) {
                        const key = `entropy:${match.substring(0, 20)}`;
                        if (!seenFindings.has(key)) {
                            seenFindings.add(key);
                            secrets.push(`[ENTROPY] High-entropy string (${entropy.toFixed(2)} bits) — line ~${i}: ${match.substring(0, 60)}...`);
                        }
                    }
                });
            }
        });
        if (secrets.length === 0) {
            return `Secret scan complete (${SECRET_PATTERNS.length} patterns + entropy analysis): No hardcoded secrets found in git additions.`;
        }
        return `Secret scan complete. WARNING: FOUND ${secrets.length} POTENTIAL EXPOSURE(S):\n\n` + secrets.join("\n");
    }
    catch (e) {
        return `Error running secret scan: ${e}`;
    }
}, {
    name: "secret_scanner",
    description: "Comprehensive secret scanner: checks git history for 24+ secret patterns (AWS, Solana, GitHub, OpenAI, JWT, SSH, mnemonics, etc.) plus Shannon entropy detection for high-entropy strings.",
    schema,
});
