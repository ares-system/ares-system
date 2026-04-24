/**
 * Minimal YAML-front-matter parser for SKILL.md files.
 *
 * SKILL.md follows the Agent Skills format:
 *
 *   ---
 *   name: solana-tracing-specialist
 *   description: Guides Solana-specific on-chain forensics—…
 *   ---
 *
 *   # Solana tracing specialist agent
 *   …
 *
 * We don't pull in `yaml` for a repo that only ever emits these two keys
 * (with possibly-multiline scalar values). A tiny regex-based parser keeps
 * the dependency surface of `@ares/engine` small.
 */

export interface SkillFrontmatter {
  name: string;
  description: string;
  /** Any additional top-level keys we don't know about, preserved as strings. */
  extras: Record<string, string>;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  /** Everything after the closing `---` fence. */
  body: string;
}

const FENCE_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/;

/**
 * Parse a SKILL.md source string into frontmatter + body.
 *
 * If the file has no frontmatter fence we synthesize `{ name: "", description: "" }`
 * and return the raw source as the body — the caller can still use it, but
 * retrieval will score it poorly.
 */
export function parseSkillMarkdown(source: string, fallbackName = ""): ParsedSkill {
  const match = FENCE_RE.exec(source);
  if (!match) {
    return {
      frontmatter: { name: fallbackName, description: "", extras: {} },
      body: source,
    };
  }

  const yamlBlock = match[1];
  const body = source.slice(match[0].length);

  const fm: SkillFrontmatter = {
    name: fallbackName,
    description: "",
    extras: {},
  };

  // Split the YAML block into top-level `key: value` pairs. Values are
  // allowed to span multiple lines — any line that doesn't start with a
  // `key:` prefix is appended to the previous value.
  const lines = yamlBlock.split(/\r?\n/);
  let currentKey: string | null = null;
  const buffer: Record<string, string[]> = {};

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, ""); // rtrim
    if (line === "") {
      if (currentKey) buffer[currentKey].push("");
      continue;
    }
    const kvMatch = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kvMatch && !rawLine.startsWith("  ")) {
      currentKey = kvMatch[1];
      const v = stripQuotes(kvMatch[2]);
      buffer[currentKey] = v === "" ? [] : [v];
    } else if (currentKey) {
      buffer[currentKey].push(line.trimStart());
    }
  }

  for (const [key, valueLines] of Object.entries(buffer)) {
    const value = valueLines.join(" ").trim();
    if (key === "name") fm.name = value || fallbackName;
    else if (key === "description") fm.description = value;
    else fm.extras[key] = value;
  }

  return { frontmatter: fm, body };
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}
