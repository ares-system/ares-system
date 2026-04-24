import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { makeFinding, makeToolResult, stringifyToolResult, toHumanSummary, } from "../findings/index.js";
const ANCHOR_PATTERNS = [
    // — High-confidence, high-signal —
    {
        ruleId: "anchor.unchecked-account",
        title: "UncheckedAccount bypasses Anchor safety checks",
        severity: "high",
        confidence: "high",
        description: "UncheckedAccount used — Anchor's type-based safety checks are disabled for this account.",
        rationale: "If the program does not implement its own ownership/discriminator checks nearby, this is usually an exploitable gap.",
        remediation: "Replace with a typed account (Account<'info, T>) or add explicit owner + discriminator checks in the handler.",
        references: [
            "https://github.com/coral-xyz/sealevel-attacks",
            "https://book.anchor-lang.com/anchor_in_depth/the_accounts_struct.html",
        ],
        regex: /UncheckedAccount/g,
    },
    {
        ruleId: "anchor.state-after-transfer",
        title: "State update after a transfer (CEI violation)",
        severity: "high",
        confidence: "medium",
        description: "State update appears to happen after a SOL/token transfer — classic CEI (Checks-Effects-Interactions) violation.",
        rationale: "Solana programs are not reentrant in the Ethereum sense, but write-after-transfer patterns often enable exploits via instruction reordering or CPI misuse.",
        remediation: "Mutate state BEFORE invoking any transfer or CPI. Double-check the intended sequence.",
        regex: /transfer\s*\(.*?\)[\s\S]{0,100}ctx\.accounts\.\w+\.\w+\s*=/g,
    },
    {
        ruleId: "anchor.missing-close-constraint",
        title: "`init` without a matching `close` target",
        severity: "medium",
        confidence: "medium",
        description: "Account initialized without a visible `close = ` target; lamports may be stranded when the account is closed.",
        rationale: "`init` creates an account; without a documented close path, rent may leak or be reclaimed by the wrong party.",
        remediation: "Ensure every init has a corresponding close/free path and it routes to a known rent-recipient.",
        regex: /#\[account\(\s*init\s*(?!.*close\s*=)[^)]*\)\]/g,
    },
    // — Medium confidence — need human review —
    {
        ruleId: "anchor.raw-accountinfo",
        title: "Raw AccountInfo in an accounts struct",
        severity: "medium",
        confidence: "medium",
        description: "Raw `AccountInfo` used — no type or ownership validation by Anchor.",
        rationale: "Skips Anchor's discriminator/owner/rent checks. May be intentional (e.g. system accounts) but often indicates missing validation.",
        remediation: "Prefer typed `Account<'info, T>` or document the deliberate validation in-line.",
        regex: /pub\s+\w+\s*:\s*AccountInfo/g,
    },
    {
        ruleId: "anchor.upgrade-authority-mentioned",
        title: "Upgrade authority referenced",
        severity: "medium",
        confidence: "low",
        description: "Code references upgrade authority — confirm it's locked or revocable only by timelock/multisig.",
        rationale: "A match means upgrade authority is mentioned, not that it is misused. Used to direct human review toward admin takeover surface.",
        regex: /set_upgrade_authority|upgrade_authority/g,
    },
    {
        ruleId: "anchor.pda-single-seed",
        title: "PDA seeds may be too narrow",
        severity: "medium",
        confidence: "low",
        description: "PDA seeds look like they contain only a single element — verify no collisions between users.",
        rationale: "Single-seed PDAs without a user/owner discriminator can collide. Regex is imperfect; confirm by reading the `seeds = [ ... ]` list.",
        regex: /seeds\s*=\s*\[\s*[^\]]*\]\s*(?!.*,\s*\w)/g,
    },
    {
        ruleId: "anchor.realloc-without-zero",
        title: "`realloc` with `zero_init = false`",
        severity: "medium",
        confidence: "medium",
        description: "Account `realloc` called with `zero_init = false` — stale bytes may remain after growth.",
        rationale: "When growing an account, leaving old bytes intact can let an attacker reinterpret stale data as new state.",
        remediation: "Pass `true` unless you've proven the grown region cannot be read as typed state.",
        regex: /realloc\s*\(\s*\d+\s*,\s*false\s*\)/g,
    },
    // — Low / Informational — signal for humans, not alarms —
    {
        ruleId: "anchor.arithmetic-hotspot",
        title: "Arithmetic on balance-like variable",
        severity: "low",
        confidence: "low",
        description: "Arithmetic on a balance-like variable without obvious `checked_*` — verify overflow safety.",
        rationale: "Rust's default arithmetic panics on overflow in debug but wraps in release; audit any use on user balances.",
        remediation: "Prefer `checked_add` / `checked_sub` / `checked_mul` on all user-controlled arithmetic.",
        regex: /(?<!\w)(amount|balance|supply|total|quantity|price)\s*[+\-*\/]=?\s*\w+/g,
    },
    {
        ruleId: "anchor.unwrap-usage",
        title: "`.unwrap()` in on-chain code",
        severity: "low",
        confidence: "medium",
        description: "`.unwrap()` found — prefer `?` or explicit error handling.",
        rationale: "`.unwrap()` panics on None/Err, which on Solana translates to a program error but reveals little context.",
        regex: /\.unwrap\(\)/g,
    },
    {
        ruleId: "anchor.invoke-without-verification",
        title: "Raw `invoke`/`invoke_signed`",
        severity: "low",
        confidence: "low",
        description: "Raw `invoke` / `invoke_signed` call — ensure target program id and accounts are verified.",
        rationale: "The regex cannot tell whether surrounding code verifies the CPI target; manual review required.",
        regex: /invoke(?:_signed)?\s*\(/g,
    },
    {
        ruleId: "anchor.oracle-reference",
        title: "Oracle / price feed referenced",
        severity: "low",
        confidence: "low",
        description: "Code references an oracle/price feed — confirm staleness and confidence-interval checks are applied.",
        rationale: "Signal only — a match doesn't imply a missing check. Used to direct review toward oracle handling.",
        regex: /price_feed|get_price|oracle.*price/gi,
    },
    {
        ruleId: "anchor.todo-in-code",
        title: "TODO / FIXME comment",
        severity: "info",
        confidence: "high",
        description: "TODO/FIXME/HACK comment found — incomplete implementation.",
        rationale: "Direct syntactic match on common TODO-style markers.",
        regex: /\/\/\s*(TODO|FIXME|HACK|XXX|UNSAFE)/gi,
    },
    {
        ruleId: "anchor.large-account-size",
        title: "Account space > 10KB",
        severity: "info",
        confidence: "high",
        description: "Account space > 10KB — consider whether all data must live on-chain.",
        rationale: "Design observation; cost/perf signal, not a vulnerability.",
        regex: /space\s*=\s*(\d{5,})/g,
    },
    {
        ruleId: "anchor.state-mutation-without-event",
        title: "State mutation without `emit!`",
        severity: "info",
        confidence: "low",
        description: "State mutation without nearby `emit!` — off-chain indexers may miss the change.",
        rationale: "Useful for protocols that rely on events, but many programs intentionally skip events for gas.",
        regex: /ctx\.accounts\.\w+\.\w+\s*=(?!.*emit!)/g,
    },
];
// ─── File Walker ────────────────────────────────────────────────────
function walkRustFiles(dir, maxDepth = 6, depth = 0) {
    const result = [];
    if (depth > maxDepth || !existsSync(dir))
        return result;
    try {
        for (const entry of readdirSync(dir)) {
            if (entry.startsWith(".") || entry === "node_modules" || entry === "target")
                continue;
            const fullPath = join(dir, entry);
            try {
                const stat = statSync(fullPath);
                if (stat.isDirectory()) {
                    result.push(...walkRustFiles(fullPath, maxDepth, depth + 1));
                }
                else if (extname(entry) === ".rs") {
                    result.push(fullPath);
                }
            }
            catch { /* permission errors */ }
        }
    }
    catch { /* access denied */ }
    return result;
}
// ─── Scanner Logic ──────────────────────────────────────────────────
function scanFile(filePath, rootDir, toolName) {
    const findings = [];
    let content;
    try {
        content = readFileSync(filePath, "utf8");
    }
    catch {
        return findings;
    }
    const lines = content.split("\n");
    const relPath = relative(rootDir, filePath).replace(/\\/g, "/");
    for (const pattern of ANCHOR_PATTERNS) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
            const lineIndex = content.substring(0, match.index).split("\n").length;
            const snippetStart = Math.max(0, lineIndex - 2);
            const snippetEnd = Math.min(lines.length, lineIndex + 2);
            const snippet = lines.slice(snippetStart, snippetEnd).join("\n").substring(0, 400);
            findings.push(makeFinding({
                tool: toolName,
                ruleId: pattern.ruleId,
                title: pattern.title,
                kind: "vulnerability",
                severity: pattern.severity,
                confidence: pattern.confidence,
                description: pattern.description,
                rationale: pattern.rationale,
                remediation: pattern.remediation,
                references: pattern.references,
                tags: ["solana", "anchor", "static-analysis"],
                location: {
                    kind: "source",
                    file: relPath,
                    startLine: lineIndex,
                    snippet,
                },
            }));
        }
    }
    return findings;
}
// ─── Tool Definition ────────────────────────────────────────────────
const TOOL_NAME = "anchor_source_scanner";
const schema = z.object({
    projectPath: z.string().describe("Absolute path to the Anchor/Rust project root"),
    programDir: z.string().optional().describe("Subdirectory containing programs (default: 'programs')"),
});
/**
 * Runs the scan and returns BOTH a human-readable string (for the LLM)
 * AND a typed ToolResult artifact (for dashboards, CI, SARIF export).
 *
 * We leave the return as a single JSON string for now so existing agents
 * keep working unchanged; once SubAgent.invokeWithArtifacts() is wired,
 * we'll flip responseFormat to "content_and_artifact".
 */
export const anchorSourceScannerTool = tool(async (input) => {
    const started = Date.now();
    const rootDir = input.projectPath;
    const programDir = input.programDir || "programs";
    const firstChoice = join(rootDir, programDir);
    const scanDir = existsSync(firstChoice)
        ? firstChoice
        : [join(rootDir, "src"), rootDir].find((d) => existsSync(d)) ?? rootDir;
    const rsFiles = walkRustFiles(scanDir);
    if (rsFiles.length === 0) {
        const empty = makeToolResult({
            tool: TOOL_NAME,
            status: "skipped",
            findings: [],
            humanSummary: `No .rs files found under ${scanDir}.`,
            durationMs: Date.now() - started,
        });
        return stringifyToolResult(empty);
    }
    const allFindings = [];
    for (const file of rsFiles) {
        allFindings.push(...scanFile(file, rootDir, TOOL_NAME));
    }
    // Deduplicate by id (id already accounts for tool+rule+location).
    const seen = new Set();
    const unique = allFindings.filter((f) => {
        if (seen.has(f.id))
            return false;
        seen.add(f.id);
        return true;
    });
    const result = makeToolResult({
        tool: TOOL_NAME,
        status: "ok",
        findings: unique,
        filesScanned: rsFiles.length,
        durationMs: Date.now() - started,
        meta: { scanDir: scanDir.replace(/\\/g, "/") },
    });
    // Provide a readable summary in the same envelope so hosts that ignore
    // structure still get a usable string.
    const withSummary = {
        ...result,
        humanSummary: toHumanSummary(result, 50),
    };
    return stringifyToolResult(withSummary);
}, {
    name: TOOL_NAME,
    description: "Heuristic static analysis for Anchor/Solana Rust source. Scans .rs files for ~13 rules (unchecked-account, raw-accountinfo, realloc-without-zero, arithmetic-hotspot, unwrap, CPI invoke, oracle references, …) and returns a structured ToolResult with Finding[] + summary. Regex-only hits default to medium or lower; use Semgrep rules for higher assurance.",
    schema,
});
