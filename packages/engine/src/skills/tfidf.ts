/**
 * Minimal TF-IDF indexer + ranker.
 *
 * Zero external deps — the whole point of skill retrieval is dropping the
 * token bill, so we won't pay for a bundled `natural` or similar. The
 * math is textbook:
 *
 *   tf(t, d)   = 0.5 + 0.5 * rawCount(t, d) / maxCount(d)   // augmented freq
 *   idf(t)     = ln(1 + N / df(t))                           // smoothed
 *   tfidf(t,d) = tf(t,d) * idf(t)
 *   score(q,d) = cosineSimilarity(qVec, dVec)
 *
 * Augmented term frequency is used so short docs (= skill descriptions)
 * aren't dominated by long ones. Cosine sim keeps scores in [0, 1].
 */

// ─── Stopwords ──────────────────────────────────────────────────────
// Curated for blockchain-intelligence skill text. Extend carefully — each
// removed word trims matching recall.
const DEFAULT_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
  "while", "to", "of", "for", "from", "in", "on", "at", "by", "with",
  "about", "as", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "not", "no", "nor",
  "this", "that", "these", "those", "it", "its", "they", "them",
  "their", "we", "our", "you", "your", "he", "she", "him", "her",
  "his", "hers", "i", "me", "my", "mine", "s", "t", "will", "would",
  "could", "should", "can", "may", "might", "must", "shall",
  "into", "onto", "out", "so", "than", "too", "very", "here", "there",
  "use", "using", "used", "uses", "via", "like", "also", "such",
  "one", "two", "three", "etc", "e.g", "i.e", "eg", "ie", "see",
  "above", "below", "across", "within", "between",
]);

export interface TokenizeOptions {
  stopwords?: Set<string>;
  /** Keep identifiers that look like on-chain symbols (addresses, CVE-XXXX). */
  keepSymbols?: boolean;
}

/**
 * Lowercase, strip punctuation, split on whitespace, drop stopwords and
 * tokens shorter than 2 chars. Hyphenated multi-words (e.g. "anchor-lang",
 * "sealevel-attacks") are split in addition to being kept as-is so both
 * granularities contribute to the signal.
 */
export function tokenize(text: string, opts: TokenizeOptions = {}): string[] {
  const stop = opts.stopwords ?? DEFAULT_STOPWORDS;
  const keepSymbols = opts.keepSymbols ?? true;

  const normalized = text.toLowerCase();
  const out: string[] = [];

  // split on anything that isn't alnum/_-/.
  for (const raw of normalized.split(/[^a-z0-9_\-./]+/)) {
    if (!raw) continue;
    // peel common trailing punctuation like ".", "…"
    const t = raw.replace(/^[.-]+|[.-]+$/g, "");
    if (!t) continue;
    if (t.length < 2) continue;
    if (stop.has(t)) continue;
    out.push(t);

    // also yield sub-tokens across hyphens/dots so "solana-tracing"
    // scores on "solana" and "tracing" queries.
    if (/[-.]/.test(t)) {
      for (const sub of t.split(/[-.]+/)) {
        if (sub.length < 2 || stop.has(sub)) continue;
        out.push(sub);
      }
    }
    // keep CVE-like tokens intact
    if (keepSymbols && /^cve-\d+/.test(t)) out.push(t);
  }
  return out;
}

// ─── Index ──────────────────────────────────────────────────────────

export interface IndexedDoc {
  id: string;
  /** Token -> raw count in this document. */
  tf: Record<string, number>;
  /** Highest count in `tf`, pre-computed for augmented-tf scoring. */
  maxCount: number;
}

export interface TfIdfIndex {
  version: 1;
  /** Total documents. */
  n: number;
  /** Sorted vocabulary. */
  vocabulary: string[];
  /** Token -> document frequency. */
  df: Record<string, number>;
  /** Token -> idf score. */
  idf: Record<string, number>;
  docs: IndexedDoc[];
  /** Wall-clock build time (ms). Informational. */
  buildMs?: number;
}

export interface BuildIndexInput {
  id: string;
  text: string;
}

export function buildIndex(
  input: BuildIndexInput[],
  tokenizeOpts?: TokenizeOptions,
): TfIdfIndex {
  const started = Date.now();
  const docs: IndexedDoc[] = [];
  const df: Record<string, number> = {};

  for (const { id, text } of input) {
    const tokens = tokenize(text, tokenizeOpts);
    const tf: Record<string, number> = {};
    for (const tok of tokens) tf[tok] = (tf[tok] ?? 0) + 1;

    const maxCount = Object.values(tf).reduce((m, v) => (v > m ? v : m), 0);
    docs.push({ id, tf, maxCount });

    // update df — each token counted once per doc
    for (const tok of Object.keys(tf)) {
      df[tok] = (df[tok] ?? 0) + 1;
    }
  }

  const n = docs.length;
  const idf: Record<string, number> = {};
  for (const [tok, f] of Object.entries(df)) {
    // smoothed idf avoids div-by-zero and keeps scores stable on tiny corpora
    idf[tok] = Math.log(1 + n / f);
  }

  const vocabulary = Object.keys(df).sort();

  return {
    version: 1,
    n,
    vocabulary,
    df,
    idf,
    docs,
    buildMs: Date.now() - started,
  };
}

// ─── Ranking ────────────────────────────────────────────────────────

/**
 * Build a unit-length TF-IDF vector for an arbitrary token list.
 * Used for both docs and queries.
 */
function vectorize(
  tokens: string[],
  index: TfIdfIndex,
): { vec: Map<string, number>; norm: number } {
  const tf: Record<string, number> = {};
  for (const tok of tokens) tf[tok] = (tf[tok] ?? 0) + 1;
  const maxCount = Object.values(tf).reduce((m, v) => (v > m ? v : m), 0) || 1;

  const vec = new Map<string, number>();
  let sqSum = 0;
  for (const [tok, count] of Object.entries(tf)) {
    const idf = index.idf[tok];
    if (idf === undefined) continue; // out-of-vocab => ignored
    const augTf = 0.5 + (0.5 * count) / maxCount;
    const w = augTf * idf;
    vec.set(tok, w);
    sqSum += w * w;
  }
  return { vec, norm: Math.sqrt(sqSum) };
}

function docVector(doc: IndexedDoc, index: TfIdfIndex) {
  const vec = new Map<string, number>();
  let sqSum = 0;
  const maxCount = doc.maxCount || 1;
  for (const [tok, count] of Object.entries(doc.tf)) {
    const idf = index.idf[tok];
    if (idf === undefined) continue;
    const augTf = 0.5 + (0.5 * count) / maxCount;
    const w = augTf * idf;
    vec.set(tok, w);
    sqSum += w * w;
  }
  return { vec, norm: Math.sqrt(sqSum) };
}

function cosine(
  a: { vec: Map<string, number>; norm: number },
  b: { vec: Map<string, number>; norm: number },
): number {
  if (a.norm === 0 || b.norm === 0) return 0;
  let dot = 0;
  // iterate over the smaller map for efficiency
  const [small, large] = a.vec.size < b.vec.size ? [a.vec, b.vec] : [b.vec, a.vec];
  for (const [tok, w] of small) {
    const other = large.get(tok);
    if (other !== undefined) dot += w * other;
  }
  return dot / (a.norm * b.norm);
}

export interface RankedResult {
  id: string;
  score: number;
}

export interface RankOptions {
  topK?: number;
  /** Skip these document ids (already-included / explicit exclusions). */
  exclude?: Iterable<string>;
  /** Drop matches below this score. Default 0.02. */
  minScore?: number;
  /** Boost these ids multiplicatively (e.g. pinned skill preferences). */
  boost?: Record<string, number>;
  tokenizeOpts?: TokenizeOptions;
}

/**
 * Rank indexed docs against a free-text query. Returns descending-score
 * hits, filtered by topK/exclude/minScore and optionally multiplicatively
 * boosted by id.
 */
export function rank(
  query: string,
  index: TfIdfIndex,
  opts: RankOptions = {},
): RankedResult[] {
  const exclude = new Set(opts.exclude ?? []);
  const minScore = opts.minScore ?? 0.02;
  const topK = opts.topK ?? 5;
  const boost = opts.boost ?? {};

  const qTokens = tokenize(query, opts.tokenizeOpts);
  if (qTokens.length === 0) return [];

  const qVec = vectorize(qTokens, index);
  if (qVec.norm === 0) return [];

  const scored: RankedResult[] = [];
  for (const doc of index.docs) {
    if (exclude.has(doc.id)) continue;
    const dVec = docVector(doc, index);
    let score = cosine(qVec, dVec);
    const b = boost[doc.id];
    if (b !== undefined) score *= b;
    if (score >= minScore) scored.push({ id: doc.id, score });
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored.slice(0, topK);
}
