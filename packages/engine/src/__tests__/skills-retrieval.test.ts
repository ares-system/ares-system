/**
 * Unit tests for the skills retrieval pipeline.
 *
 * Covers frontmatter parsing, TF-IDF math, ranker quality on a small
 * synthetic corpus, on-disk cache build + invalidation, and the
 * integration `loadSkillsForTask` entry point.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseSkillMarkdown } from "../skills/frontmatter.js";
import { buildIndex, rank, tokenize } from "../skills/tfidf.js";
import {
  buildSkillCatalog,
  loadSkillsForTask,
  rankSkillsForQuery,
  renderCatalogSummary,
} from "../skills/retrieval.js";

// ─── Frontmatter ────────────────────────────────────────────────────

describe("parseSkillMarkdown", () => {
  it("parses name + description", () => {
    const src = [
      "---",
      "name: foo",
      "description: Detects foo patterns in Solana code.",
      "---",
      "",
      "# Foo skill",
      "",
      "body content",
    ].join("\n");
    const parsed = parseSkillMarkdown(src);
    assert.equal(parsed.frontmatter.name, "foo");
    assert.match(parsed.frontmatter.description, /Detects foo patterns/);
    assert.match(parsed.body, /# Foo skill/);
  });

  it("supports multi-line description values", () => {
    const src = [
      "---",
      "name: bar",
      "description: This is a long description",
      "  that continues on the next line.",
      "---",
      "",
      "body",
    ].join("\n");
    const parsed = parseSkillMarkdown(src);
    assert.match(parsed.frontmatter.description, /continues on the next line/);
  });

  it("returns empty frontmatter + full source when no fence", () => {
    const src = "# No frontmatter here\n\njust text";
    const parsed = parseSkillMarkdown(src, "fallback");
    assert.equal(parsed.frontmatter.name, "fallback");
    assert.equal(parsed.frontmatter.description, "");
    assert.equal(parsed.body, src);
  });

  it("strips quoted scalar values", () => {
    const src = [
      "---",
      'name: "quoted-name"',
      "description: 'single-quoted'",
      "---",
      "body",
    ].join("\n");
    const parsed = parseSkillMarkdown(src);
    assert.equal(parsed.frontmatter.name, "quoted-name");
    assert.equal(parsed.frontmatter.description, "single-quoted");
  });
});

// ─── Tokenizer ──────────────────────────────────────────────────────

describe("tokenize", () => {
  it("lowercases and strips stopwords", () => {
    const toks = tokenize("The Solana Program is fast");
    assert.ok(toks.includes("solana"));
    assert.ok(toks.includes("program"));
    assert.ok(!toks.includes("the"));
    assert.ok(!toks.includes("is"));
  });

  it("splits hyphenated compound tokens while keeping the original", () => {
    const toks = tokenize("anchor-source-scanner detects unchecked accounts");
    assert.ok(toks.includes("anchor-source-scanner"));
    assert.ok(toks.includes("anchor"));
    assert.ok(toks.includes("source"));
    assert.ok(toks.includes("scanner"));
  });

  it("drops tokens shorter than 2 chars", () => {
    const toks = tokenize("a b cc");
    assert.ok(!toks.includes("a"));
    assert.ok(!toks.includes("b"));
    assert.ok(toks.includes("cc"));
  });
});

// ─── TF-IDF math ────────────────────────────────────────────────────

describe("buildIndex + rank", () => {
  const docs = [
    { id: "anchor", text: "anchor program solana unchecked account validation" },
    { id: "rug", text: "rug pull liquidity lock dev wallet exit scam" },
    { id: "secrets", text: "secret scan git history aws key openai token" },
    { id: "osint", text: "osint investigation bellingcat verification social media" },
  ];

  it("computes IDF for every token", () => {
    const idx = buildIndex(docs);
    for (const tok of idx.vocabulary) {
      assert.ok(idx.idf[tok] !== undefined, `missing idf for ${tok}`);
      assert.ok(idx.idf[tok] > 0, `non-positive idf for ${tok}`);
    }
  });

  it("ranks anchor doc first for anchor-y queries", () => {
    const idx = buildIndex(docs);
    const top = rank("How do I detect unchecked account patterns in Anchor?", idx);
    assert.ok(top.length > 0, "should find matches");
    assert.equal(top[0].id, "anchor");
  });

  it("ranks rug doc first for rug-y queries", () => {
    const idx = buildIndex(docs);
    const top = rank("liquidity pool rug exit scam detection", idx);
    assert.equal(top[0].id, "rug");
  });

  it("respects topK and minScore", () => {
    const idx = buildIndex(docs);
    const top = rank("anchor program", idx, { topK: 2 });
    assert.ok(top.length <= 2);
    const zero = rank("completely unrelated xyzzy foo bar", idx, { minScore: 0.1 });
    assert.equal(zero.length, 0);
  });

  it("exclude drops listed ids", () => {
    const idx = buildIndex(docs);
    const top = rank("anchor", idx, { exclude: ["anchor"] });
    for (const r of top) assert.notEqual(r.id, "anchor");
  });

  it("boost reorders matches", () => {
    // Build a tiny corpus where the boosted doc scores > 0 on the query
    // (otherwise boost is multiplying zero).
    const corpus = [
      { id: "a", text: "solana anchor program account validation" },
      { id: "b", text: "solana token sniffer" },
    ];
    const idx = buildIndex(corpus);
    const baseline = rank("solana account", idx, { minScore: 0 });
    assert.equal(baseline[0].id, "a", "a matches more query terms");
    const boosted = rank("solana account", idx, { boost: { b: 100 }, minScore: 0 });
    assert.equal(boosted[0].id, "b", "boost should lift b above a");
  });

  it("returns [] for empty queries", () => {
    const idx = buildIndex(docs);
    assert.deepEqual(rank("", idx), []);
    assert.deepEqual(rank("a of the", idx), []); // all stopwords
  });
});

// ─── Catalog build + cache ──────────────────────────────────────────

function makeTempRepo(skills: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "asst-skills-"));
  const skillsDir = join(root, ".agents", "skills");
  mkdirSync(skillsDir, { recursive: true });
  for (const [name, content] of Object.entries(skills)) {
    const dir = join(skillsDir, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), content, "utf8");
  }
  return root;
}

const ANCHOR_SKILL = [
  "---",
  "name: anchor-vulns",
  "description: Detects Anchor constraint and PDA seed vulnerabilities in Solana programs.",
  "---",
  "# body about anchor programs, unchecked accounts, and PDAs",
].join("\n");

const RUG_SKILL = [
  "---",
  "name: rug-detection",
  "description: Heuristic rug pull detection for token launches — liquidity locks, dev wallet clustering, exit patterns.",
  "---",
  "# body about rug pulls and liquidity",
].join("\n");

const SECRETS_SKILL = [
  "---",
  "name: secret-scanner",
  "description: Scans repositories for leaked API keys, AWS credentials, and private keys.",
  "---",
  "# body about secret scanning",
].join("\n");

describe("buildSkillCatalog", () => {
  it("indexes every skill and writes a cache file", () => {
    const repo = makeTempRepo({
      "anchor-vulns": ANCHOR_SKILL,
      "rug-detection": RUG_SKILL,
      "secret-scanner": SECRETS_SKILL,
    });
    const cat = buildSkillCatalog(repo);
    assert.ok(cat);
    assert.equal(cat!.entries.length, 3);
    const names = cat!.entries.map((e) => e.name).sort();
    assert.deepEqual(names, ["anchor-vulns", "rug-detection", "secret-scanner"]);
    assert.ok(existsSync(join(repo, ".asst", "skills-index.json")));
  });

  it("returns undefined when no skills root exists", () => {
    const repo = mkdtempSync(join(tmpdir(), "asst-empty-"));
    assert.equal(buildSkillCatalog(repo), undefined);
  });

  it("reuses the on-disk cache when nothing changed", () => {
    const repo = makeTempRepo({ "anchor-vulns": ANCHOR_SKILL });
    const first = buildSkillCatalog(repo)!;
    const second = buildSkillCatalog(repo)!;
    // builtAt is only set on a fresh build — reuse implies same timestamp.
    assert.equal(first.builtAt, second.builtAt);
  });

  it("rebuilds when a SKILL.md is modified", () => {
    const repo = makeTempRepo({ "anchor-vulns": ANCHOR_SKILL });
    const first = buildSkillCatalog(repo)!;

    // mutate the skill file + bump mtime meaningfully
    const mdPath = first.entries[0].path;
    writeFileSync(mdPath, ANCHOR_SKILL + "\n# extra section", "utf8");
    const later = new Date(Date.now() + 5_000);
    utimesSync(mdPath, later, later);

    const second = buildSkillCatalog(repo)!;
    assert.notEqual(first.builtAt, second.builtAt);
  });

  it("force: true ignores the cache", () => {
    const repo = makeTempRepo({ "anchor-vulns": ANCHOR_SKILL });
    const first = buildSkillCatalog(repo)!;
    // wait a tick so Date.now differs
    const start = Date.now();
    while (Date.now() === start) {
      /* spin */
    }
    const second = buildSkillCatalog(repo, { force: true })!;
    assert.notEqual(first.builtAt, second.builtAt);
  });
});

// ─── Ranking against real catalog ───────────────────────────────────

describe("rankSkillsForQuery", () => {
  it("returns anchor-vulns for anchor queries", () => {
    const repo = makeTempRepo({
      "anchor-vulns": ANCHOR_SKILL,
      "rug-detection": RUG_SKILL,
      "secret-scanner": SECRETS_SKILL,
    });
    const cat = buildSkillCatalog(repo)!;
    const ranked = rankSkillsForQuery(cat, "audit anchor program for unchecked account vulnerabilities");
    assert.ok(ranked.length > 0);
    assert.equal(ranked[0].name, "anchor-vulns");
  });

  it("returns rug-detection for token-launch queries", () => {
    const repo = makeTempRepo({
      "anchor-vulns": ANCHOR_SKILL,
      "rug-detection": RUG_SKILL,
      "secret-scanner": SECRETS_SKILL,
    });
    const cat = buildSkillCatalog(repo)!;
    const ranked = rankSkillsForQuery(cat, "detect rug pull liquidity lock and dev wallet exit");
    assert.equal(ranked[0].name, "rug-detection");
  });

  it("honors exclude list", () => {
    const repo = makeTempRepo({
      "anchor-vulns": ANCHOR_SKILL,
      "rug-detection": RUG_SKILL,
    });
    const cat = buildSkillCatalog(repo)!;
    const ranked = rankSkillsForQuery(cat, "anchor", { exclude: ["anchor-vulns"] });
    for (const r of ranked) assert.notEqual(r.name, "anchor-vulns");
  });
});

// ─── End-to-end: loadSkillsForTask ──────────────────────────────────

describe("loadSkillsForTask", () => {
  it("always includes pinned skills even when the query is empty", () => {
    const repo = makeTempRepo({
      "anchor-vulns": ANCHOR_SKILL,
      "rug-detection": RUG_SKILL,
    });
    const { text, used } = loadSkillsForTask(repo, "", {
      pinned: ["anchor-vulns"],
      topK: 2,
    });
    assert.match(text, /--- SKILL: anchor-vulns ---/);
    assert.equal(used[0].name, "anchor-vulns");
  });

  it("adds top-K retrieved skills on top of pinned", () => {
    const repo = makeTempRepo({
      "anchor-vulns": ANCHOR_SKILL,
      "rug-detection": RUG_SKILL,
      "secret-scanner": SECRETS_SKILL,
    });
    const { used } = loadSkillsForTask(repo, "liquidity lock rug pull analysis", {
      pinned: ["anchor-vulns"],
      topK: 2,
    });
    const names = used.map((s) => s.name);
    assert.ok(names.includes("anchor-vulns"));
    assert.ok(names.includes("rug-detection"));
  });

  it("drops ranked skills that would exceed the char budget", () => {
    const big = ["---", "name: big", "description: Very long skill body."].join("\n")
      + "\n---\n" + "x".repeat(5_000);
    const small = ["---", "name: small", "description: Short skill about liquidity locks."].join("\n")
      + "\n---\n" + "x".repeat(1_000);
    const repo = makeTempRepo({ big, small });
    const { used, dropped } = loadSkillsForTask(repo, "liquidity lock skill body", {
      topK: 5,
      maxChars: 2_500, // only 'small' fits
    });
    assert.ok(used.length >= 1);
    for (const s of used) assert.notEqual(s.name, "big");
    assert.ok(dropped.some((d) => d.name === "big") || used.every((u) => u.name !== "big"));
  });

  it("returns empty result when no skills root exists", () => {
    const repo = mkdtempSync(join(tmpdir(), "asst-skills-empty-"));
    const out = loadSkillsForTask(repo, "anchor");
    assert.equal(out.text, "");
    assert.equal(out.used.length, 0);
  });
});

// ─── Catalog summary renderer ───────────────────────────────────────

describe("renderCatalogSummary", () => {
  it("emits one bullet per skill with truncated descriptions", () => {
    const repo = makeTempRepo({
      "anchor-vulns": ANCHOR_SKILL,
      "rug-detection": RUG_SKILL,
    });
    const cat = buildSkillCatalog(repo)!;
    const s = renderCatalogSummary(cat, 50);
    assert.match(s, /^- anchor-vulns:/m);
    assert.match(s, /^- rug-detection:/m);
    for (const line of s.split("\n")) {
      // `- <name>: ` prefix + up to 50 chars of description
      const idx = line.indexOf(": ");
      if (idx < 0) continue;
      const desc = line.slice(idx + 2);
      assert.ok(desc.length <= 50, `line too long: ${line}`);
    }
  });
});
