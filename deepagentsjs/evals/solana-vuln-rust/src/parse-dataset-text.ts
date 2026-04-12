/**
 * Parse Hugging Face `FraChiacc99/solana-vuln-rust` row `text` (instruction-style transcript).
 */

/** First user turn and first assistant reply after it. */
export function parseFirstTurn(fullText: string): {
  query: string;
  referenceAnswer: string;
} | null {
  const instOpen = fullText.indexOf("[INST]");
  if (instOpen === -1) return null;
  const instClose = fullText.indexOf("[/INST]", instOpen);
  if (instClose === -1) return null;
  const query = fullText
    .slice(instOpen + "[INST]".length, instClose)
    .trim();
  let rest = fullText.slice(instClose + "[/INST]".length);
  const nextInst = rest.indexOf("<s>");
  const nextInst2 = rest.indexOf("[INST]");
  let cut = rest.length;
  if (nextInst !== -1) cut = Math.min(cut, nextInst);
  if (nextInst2 !== -1) cut = Math.min(cut, nextInst2);
  let ref = rest.slice(0, cut).trim();
  ref = ref.replace(/<\/s>\s*$/i, "").trim();
  return { query, referenceAnswer: ref };
}

/**
 * Whether the dataset reference answer asserts a vulnerability is present.
 * Returns null if the label cannot be inferred.
 */
export function referenceIndicatesVulnerable(
  referenceAnswer: string,
): boolean | null {
  const t = referenceAnswer.trim();
  if (/^Yes, it contains/i.test(t) || /Yes, it contains a vulnerability/i.test(t))
    return true;
  if (
    /^No, it does not/i.test(t) ||
    /does not contain any vulnerabilities/i.test(t)
  )
    return false;
  return null;
}
