/**
 * High-level skill retrieval — builds a per-repo catalog of skill
 * descriptions, TF-IDF-ranks them against a query, and loads only the
 * top-K full bodies on demand.
 *
 * The catalog is cached at `.asst/skills-index.json` and invalidated when
 * any SKILL.md mtime changes (or the file list itself changes).
 *
 * Design goals:
 *   - Zero cost when retrieval is disabled (opt-in via env / sub-agent config).
 *   - Catalog = lightweight summary (name + description) for ALL skills.
 *   - Full body is loaded only for retrieved matches, bounded by a
 *     char/token budget.
 *   - Idempotent: calling buildSkillCatalog() twice returns the same index.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { parseSkillMarkdown } from "./frontmatter.js";
import { buildIndex, rank, type TfIdfIndex } from "./tfidf.js";

// ─── Paths ──────────────────────────────────────────────────────────

const CACHE_VERSION = 1 as const;

function findSkillsRoot(repoRoot: string): string | undefined {
  const candidates = [
    join(repoRoot, ".agents", "skills"),
    join(repoRoot, ".cursor", "skills"),
  ];
  return candidates.find((d) => existsSync(d));
}

function cachePath(repoRoot: string): string {
  return join(repoRoot, ".asst", "skills-index.json");
}

// ─── Types ──────────────────────────────────────────────────────────

export interface SkillCatalogEntry {
  name: string;
  /** 1-line description from frontmatter (may be empty). */
  description: string;
  /** Path to SKILL.md — absolute. */
  path: string;
  /** File mtime used for cache invalidation. */
  mtimeMs: number;
  /** Total byte size of SKILL.md — handy for budgeting. */
  sizeBytes: number;
}

export interface SkillCatalog {
  version: typeof CACHE_VERSION;
  repoRoot: string;
  skillsRoot: string;
  builtAt: string;
  entries: SkillCatalogEntry[];
  /** Keyed by skill `name`, value is the TF-IDF index for descriptions. */
  index: TfIdfIndex;
}

export interface RankedSkill {
  name: string;
  description: string;
  path: string;
  score: number;
}

// ─── Catalog build / cache ──────────────────────────────────────────

function readEntries(skillsRoot: string): SkillCatalogEntry[] {
  const entries: SkillCatalogEntry[] = [];
  const dirs = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of dirs) {
    const mdPath = join(skillsRoot, name, "SKILL.md");
    if (!existsSync(mdPath)) continue;
    const stat = statSync(mdPath);
    const raw = readFileSync(mdPath, "utf8");
    const parsed = parseSkillMarkdown(raw, name);
    entries.push({
      name: parsed.frontmatter.name || name,
      description: parsed.frontmatter.description,
      path: mdPath,
      mtimeMs: stat.mtimeMs,
      sizeBytes: stat.size,
    });
  }
  return entries;
}

function makeCatalog(repoRoot: string, skillsRoot: string): SkillCatalog {
  const entries = readEntries(skillsRoot);
  // Index description + name; name boosts exact-keyword matches like
  // "anchor-source-scanner".
  const index = buildIndex(
    entries.map((e) => ({ id: e.name, text: `${e.name} ${e.description}` })),
  );
  return {
    version: CACHE_VERSION,
    repoRoot,
    skillsRoot,
    builtAt: new Date().toISOString(),
    entries,
    index,
  };
}

function catalogMatches(cached: SkillCatalog, fresh: SkillCatalogEntry[]): boolean {
  if (cached.version !== CACHE_VERSION) return false;
  if (cached.entries.length !== fresh.length) return false;
  const cachedById = new Map(cached.entries.map((e) => [e.name, e]));
  for (const f of fresh) {
    const c = cachedById.get(f.name);
    if (!c) return false;
    if (c.mtimeMs !== f.mtimeMs || c.sizeBytes !== f.sizeBytes) return false;
  }
  return true;
}

/**
 * Build (or re-use) the skill catalog for this repo. On-disk cache is
 * invalidated when any SKILL.md mtime/size changes or the file list itself
 * changes.
 *
 * Set `force: true` to ignore the cache.
 */
export function buildSkillCatalog(
  repoRoot: string,
  opts: { force?: boolean } = {},
): SkillCatalog | undefined {
  const skillsRoot = findSkillsRoot(repoRoot);
  if (!skillsRoot) return undefined;

  const fresh = readEntries(skillsRoot);
  if (fresh.length === 0) return undefined;

  const cacheFile = cachePath(repoRoot);

  if (!opts.force && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf8")) as SkillCatalog;
      if (catalogMatches(cached, fresh)) return cached;
    } catch {
      // fall through to rebuild
    }
  }

  const catalog = makeCatalog(repoRoot, skillsRoot);
  try {
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(catalog), "utf8");
  } catch {
    // non-fatal — retrieval still works, we just don't benefit from cache
  }
  return catalog;
}

// ─── Query ──────────────────────────────────────────────────────────

export interface RankSkillsOptions {
  topK?: number;
  exclude?: Iterable<string>;
  /** Minimum cosine similarity. Default 0.05 — higher than the default in
   *  tfidf.ts because short skill descriptions need a clear match. */
  minScore?: number;
  /** Multiplicative score boost keyed by skill name. */
  boost?: Record<string, number>;
}

/**
 * Rank skills in the catalog by relevance to a free-text query.
 */
export function rankSkillsForQuery(
  catalog: SkillCatalog,
  query: string,
  opts: RankSkillsOptions = {},
): RankedSkill[] {
  const results = rank(query, catalog.index, {
    topK: opts.topK ?? 3,
    exclude: opts.exclude,
    minScore: opts.minScore ?? 0.05,
    boost: opts.boost,
  });

  const entriesByName = new Map(catalog.entries.map((e) => [e.name, e]));
  return results
    .map((r) => {
      const e = entriesByName.get(r.id);
      if (!e) return undefined;
      return {
        name: e.name,
        description: e.description,
        path: e.path,
        score: r.score,
      } as RankedSkill;
    })
    .filter((x): x is RankedSkill => !!x);
}

// ─── Loading skill bodies ───────────────────────────────────────────

export interface LoadSkillsForTaskOptions {
  /** Skills that MUST be included regardless of score. These are loaded first
   *  and counted against the char budget. */
  pinned?: string[];
  /** How many TF-IDF ranked skills to add after the pinned ones. */
  topK?: number;
  /** Skills to exclude from retrieval (e.g. already in a parent prompt). */
  exclude?: Iterable<string>;
  /** Total character budget for the combined output. Default 20 000 (~5k tokens). */
  maxChars?: number;
  /** Multiplicative boosts keyed by skill name (e.g. pinned == 1.25). */
  boost?: Record<string, number>;
  /** Override the on-disk cache build. */
  catalog?: SkillCatalog;
}

export interface LoadSkillsForTaskResult {
  /** Combined, prompt-ready text. Empty string if no skills matched. */
  text: string;
  /** Skills actually included, in order. */
  used: RankedSkill[];
  /** Skills that matched but were dropped by the budget. */
  dropped: RankedSkill[];
}

/**
 * Load the combined SKILL.md bodies for pinned + TF-IDF-ranked skills,
 * bounded by a character budget. Returns the prompt text and bookkeeping.
 *
 * Budget rule: pinned skills are always included (even if they blow the
 * budget alone). Ranked skills are added only while there's room.
 */
export function loadSkillsForTask(
  repoRoot: string,
  query: string,
  opts: LoadSkillsForTaskOptions = {},
): LoadSkillsForTaskResult {
  const catalog = opts.catalog ?? buildSkillCatalog(repoRoot);
  if (!catalog) return { text: "", used: [], dropped: [] };

  const entryByName = new Map(catalog.entries.map((e) => [e.name, e]));
  const pinnedList = opts.pinned ?? [];
  const maxChars = opts.maxChars ?? 20_000;

  const exclude = new Set([...(opts.exclude ?? []), ...pinnedList]);

  const ranked = query
    ? rankSkillsForQuery(catalog, query, {
        topK: opts.topK ?? 2,
        exclude,
        boost: opts.boost,
      })
    : [];

  // Build the output list: pinned first (in catalog order), then ranked.
  const sections: string[] = [];
  const used: RankedSkill[] = [];
  const dropped: RankedSkill[] = [];
  let totalChars = 0;

  const pinnedSkills: RankedSkill[] = pinnedList
    .map((name) => {
      const e = entryByName.get(name);
      if (!e) return undefined;
      return { name: e.name, description: e.description, path: e.path, score: 1 };
    })
    .filter((x): x is RankedSkill => !!x);

  for (const skill of pinnedSkills) {
    const body = safeReadFile(skill.path);
    if (!body) continue;
    sections.push(renderSection(skill, body));
    used.push(skill);
    totalChars += body.length;
  }

  for (const skill of ranked) {
    const body = safeReadFile(skill.path);
    if (!body) continue;
    if (totalChars + body.length > maxChars) {
      dropped.push(skill);
      continue;
    }
    sections.push(renderSection(skill, body));
    used.push(skill);
    totalChars += body.length;
  }

  return { text: sections.join("\n"), used, dropped };
}

function renderSection(skill: RankedSkill, body: string): string {
  return [
    `\n--- SKILL: ${skill.name} ---`,
    body,
    `--- END SKILL ---\n`,
  ].join("\n");
}

function safeReadFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

// ─── Catalog summary (for system prompt) ────────────────────────────

/**
 * Render a compact catalog listing for injection into a routing prompt.
 * One line per skill: `- name: description (140 chars max)`.
 */
export function renderCatalogSummary(catalog: SkillCatalog, maxDescChars = 140): string {
  const lines: string[] = [];
  for (const e of catalog.entries) {
    const desc = (e.description || "").replace(/\s+/g, " ").trim().slice(0, maxDescChars);
    lines.push(`- ${e.name}: ${desc}`);
  }
  return lines.join("\n");
}
