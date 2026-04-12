/**
 * Classify model prose vs HF reference labels. Models often answer "No." as the
 * first token but still describe a vulnerability below; naive "contains Yes" checks
 * mispredict on that pattern.
 */

/** HF-style denial; models often insert e.g. "security" before "vulnerabilities". */
const DENIES_VULNS_PRESENT =
  /does not contain any (?:security\s+)?vulnerabilit(?:y|ies)/i;

/** Strip common negation phrases before scanning for an affirmative vuln mention. */
function scanForAffirmativeVulnerability(text: string): string {
  let s = text;
  s = s.replace(/\bno\s+vulnerabilit(y|ies)\b/gi, "");
  s = s.replace(/\bwithout\s+vulnerabilit(y|ies)\b/gi, "");
  s = s.replace(/\bdoes not contain any (?:security\s+)?vulnerabilit(?:y|ies)\b/gi, "");
  return s;
}

/** Whether the model affirms that a vulnerability is present (aligns with reference label `true`). */
export function textAgreesVulnerableReference(text: string): boolean {
  const raw = text.trim();
  if (DENIES_VULNS_PRESENT.test(raw)) return false;
  if (/^\s*Yes\b/im.test(raw)) return true;
  const scan = scanForAffirmativeVulnerability(raw);
  return /\bvulnerabilit(y|ies)\b/i.test(scan);
}

/** Whether the model affirms safety (aligns with reference label `false`). */
export function textAgreesSafeReference(text: string): boolean {
  const raw = text.trim();
  if (/^\s*Yes\b/im.test(raw)) return false;
  if (textAgreesVulnerableReference(raw)) return false;
  if (DENIES_VULNS_PRESENT.test(raw)) return true;
  if (/^\s*No\b/im.test(raw)) return true;
  return false;
}
