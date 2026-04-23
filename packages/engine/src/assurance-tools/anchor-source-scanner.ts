import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ─── Anchor/Rust Vulnerability Patterns ─────────────────────────────

interface Finding {
  severity: "Critical" | "High" | "Medium" | "Low" | "Informational";
  pattern: string;
  description: string;
  file: string;
  line: number;
  snippet: string;
}

const ANCHOR_PATTERNS: Array<{
  name: string;
  severity: Finding["severity"];
  description: string;
  regex: RegExp;
}> = [
  // Critical - Missing signer checks
  {
    name: "missing-signer-check",
    severity: "Critical",
    description: "Account used without #[account(signer)] or has_one constraint — potential unauthorized access",
    regex: /pub\s+\w+\s*:\s*AccountInfo/g
  },
  {
    name: "unchecked-account",
    severity: "Critical",
    description: "UncheckedAccount used — bypasses all Anchor safety checks",
    regex: /UncheckedAccount/g
  },
  // Critical - Unsafe math
  {
    name: "arithmetic-overflow",
    severity: "Critical",
    description: "Direct arithmetic without checked_* methods — risk of overflow/underflow",
    regex: /(?<!\w)(amount|balance|supply|total|quantity|price)\s*[+\-*\/]=?\s*\w+/g
  },
  // High - Missing account validation
  {
    name: "missing-owner-check",
    severity: "High",
    description: "Account constraint without owner check — account may belong to wrong program",
    regex: /#\[account\(\s*(?!.*owner\s*=)(?!.*constraint\s*=.*owner).*\)\]/g
  },
  {
    name: "missing-close-constraint",
    severity: "High",
    description: "init without close target — lamports will be lost when account is closed",
    regex: /#\[account\(\s*init\s*(?!.*close\s*=)[^)]*\)\]/g
  },
  // High - Authority patterns
  {
    name: "upgrade-authority-not-checked",
    severity: "High",
    description: "Program does not verify upgrade authority — attacker could upgrade to malicious version",
    regex: /set_upgrade_authority|upgrade_authority/g
  },
  // High - PDA issues
  {
    name: "pda-seed-collision",
    severity: "High",
    description: "PDA seeds use only 1 parameter — risk of seed collision between different users",
    regex: /seeds\s*=\s*\[\s*[^\]]*\]\s*(?!.*,\s*\w)/g
  },
  // Medium - CPI safety
  {
    name: "unvalidated-cpi-target",
    severity: "Medium",
    description: "Cross-program invocation without verifying target program ID",
    regex: /invoke(?:_signed)?\s*\(/g
  },
  {
    name: "cpi-missing-signer-seeds",
    severity: "Medium",
    description: "CPI invoke without signer seeds — PDA may not be signing correctly",
    regex: /invoke\s*\(\s*&\w+\s*,\s*&\[.*?\]\s*\)/g
  },
  // Medium - State management
  {
    name: "missing-realloc-zero",
    severity: "Medium",
    description: "Account realloc without zeroing — stale data could persist",
    regex: /realloc\s*\(\s*\d+\s*,\s*false\s*\)/g
  },
  {
    name: "unwrap-without-error",
    severity: "Medium",
    description: "Using .unwrap() instead of proper error handling — will panic on None/Err",
    regex: /\.unwrap\(\)/g
  },
  // Medium - Access control
  {
    name: "missing-freeze-authority",
    severity: "Medium",
    description: "Mint/token operations without checking freeze authority",
    regex: /freeze_authority/g
  },
  {
    name: "missing-has-one",
    severity: "Medium",
    description: "Account struct without has_one constraints — related accounts not validated",
    regex: /#\[account\(\s*mut\s*(?!.*has_one)[^)]*\)\]\s*\n\s*pub\s+\w+\s*:\s*Account/g
  },
  // Low - Best practices
  {
    name: "todo-in-code",
    severity: "Low",
    description: "TODO/FIXME/HACK comment found — incomplete implementation",
    regex: /\/\/\s*(TODO|FIXME|HACK|XXX|UNSAFE)/gi
  },
  {
    name: "large-account-size",
    severity: "Low",
    description: "Account space > 10KB — consider if all data is necessary on-chain",
    regex: /space\s*=\s*(\d{5,})/g
  },
  {
    name: "missing-event-emit",
    severity: "Informational",
    description: "State mutation without emit! — off-chain services won't detect this change",
    regex: /ctx\.accounts\.\w+\.\w+\s*=(?!.*emit!)/g
  },
  // Critical - Reentrancy
  {
    name: "state-after-transfer",
    severity: "Critical",
    description: "State update after SOL/token transfer — classic reentrancy pattern",
    regex: /transfer\s*\(.*?\)[\s\S]{0,100}ctx\.accounts\.\w+\.\w+\s*=/g
  },
  // High - Oracle safety
  {
    name: "missing-oracle-staleness",
    severity: "High",
    description: "Oracle price used without staleness check — stale prices can be manipulated",
    regex: /price_feed|get_price|oracle.*price/gi
  },
  // Medium - Token safety
  {
    name: "missing-decimals-check",
    severity: "Medium",
    description: "Token amount used without decimal normalization — precision loss risk",
    regex: /amount\s*\*\s*10\s*\^|amount\.checked_mul|decimals/g
  }
];

// ─── File Walker ────────────────────────────────────────────────────

function walkRustFiles(dir: string, maxDepth = 6, depth = 0): string[] {
  const result: string[] = [];
  if (depth > maxDepth || !existsSync(dir)) return result;

  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".") || entry === "node_modules" || entry === "target") continue;
      const fullPath = join(dir, entry);

      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          result.push(...walkRustFiles(fullPath, maxDepth, depth + 1));
        } else if (extname(entry) === ".rs") {
          result.push(fullPath);
        }
      } catch { /* permission errors */ }
    }
  } catch { /* access denied */ }

  return result;
}

// ─── Scanner Logic ──────────────────────────────────────────────────

function scanFile(filePath: string, rootDir: string): Finding[] {
  const findings: Finding[] = [];
  let content: string;

  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return findings;
  }

  const lines = content.split("\n");
  const relPath = relative(rootDir, filePath);

  for (const pattern of ANCHOR_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      // Find the line number
      const lineIndex = content.substring(0, match.index).split("\n").length;
      const snippetStart = Math.max(0, lineIndex - 2);
      const snippetEnd = Math.min(lines.length, lineIndex + 2);
      const snippet = lines.slice(snippetStart, snippetEnd).join("\n");

      findings.push({
        severity: pattern.severity,
        pattern: pattern.name,
        description: pattern.description,
        file: relPath,
        line: lineIndex,
        snippet: snippet.substring(0, 200)
      });
    }
  }

  return findings;
}

// ─── Tool Definition ────────────────────────────────────────────────

const schema = z.object({
  projectPath: z.string().describe("Absolute path to the Anchor/Rust project root"),
  programDir: z.string().optional().describe("Subdirectory containing programs (default: 'programs')")
});

export const anchorSourceScannerTool = tool(
  async (input: z.infer<typeof schema>) => {
    const rootDir = input.projectPath;
    const programDir = input.programDir || "programs";
    const scanDir = join(rootDir, programDir);

    if (!existsSync(scanDir)) {
      // Fallback: scan src/ or the root
      const altDirs = [join(rootDir, "src"), rootDir];
      const useDir = altDirs.find(d => existsSync(d)) || rootDir;
      return scanDirectory(useDir, rootDir);
    }

    return scanDirectory(scanDir, rootDir);
  },
  {
    name: "anchor_source_scanner",
    description: "Static analysis tool for Anchor/Solana Rust source code. Scans .rs files for 19 vulnerability patterns including missing signer checks, arithmetic overflow, reentrancy, PDA seed collisions, and CPI safety issues. Returns structured findings with severity ratings.",
    schema
  }
);

function scanDirectory(scanDir: string, rootDir: string): string {
  const rsFiles = walkRustFiles(scanDir);

  if (rsFiles.length === 0) {
    return JSON.stringify({
      status: "no_files",
      message: `No .rs files found in ${scanDir}`,
      findings: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, informational: 0 }
    });
  }

  const allFindings: Finding[] = [];
  for (const file of rsFiles) {
    allFindings.push(...scanFile(file, rootDir));
  }

  // Deduplicate by file+line+pattern
  const seen = new Set<string>();
  const unique = allFindings.filter(f => {
    const key = `${f.file}:${f.line}:${f.pattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by severity
  const severityOrder: Record<string, number> = {
    Critical: 0, High: 1, Medium: 2, Low: 3, Informational: 4
  };
  unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summary = {
    total: unique.length,
    critical: unique.filter(f => f.severity === "Critical").length,
    high: unique.filter(f => f.severity === "High").length,
    medium: unique.filter(f => f.severity === "Medium").length,
    low: unique.filter(f => f.severity === "Low").length,
    informational: unique.filter(f => f.severity === "Informational").length,
    files_scanned: rsFiles.length
  };

  return JSON.stringify({ status: "complete", summary, findings: unique.slice(0, 50) }, null, 2);
}
