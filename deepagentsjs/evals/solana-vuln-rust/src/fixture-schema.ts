/**
 * One JSONL record produced by `scripts/fetch-dataset.ts`.
 * Each line is a single JSON object (newline-delimited).
 */
export interface HfFixtureRow {
  /** Row index in the Hugging Face `train` split. */
  rowIdx: number;
  /** First `[INST]…[/INST]` user block (includes the Rust snippet question). */
  query: string;
  /** Model reference answer (first assistant segment after `[/INST]`). */
  referenceAnswer: string;
  /**
   * Parsed Yes/No vulnerability label from `referenceAnswer` via
   * `referenceIndicatesVulnerable()`. Omitted in JSONL when unknown (`null`).
   */
  referenceVulnerable?: boolean | null;
}
