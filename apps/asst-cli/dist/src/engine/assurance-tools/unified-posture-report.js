import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
const schema = z.object({
    assuranceDir: z.string().describe("Path to assurance output directory"),
});
function computeGrade(score) {
    if (score >= 90)
        return "A";
    if (score >= 80)
        return "B";
    if (score >= 70)
        return "C";
    if (score >= 60)
        return "D";
    return "F";
}
export const unifiedPostureReportTool = tool(async (input) => {
    if (!existsSync(input.assuranceDir)) {
        return "Assurance directory not found. Cannot generate posture report. Ensure 'write_assurance_manifest' ran successfully.";
    }
    const layers = [];
    // ── L1: Secret Hygiene ──────────────────────────────────────────
    const scanPath = join(input.assuranceDir, "..", ".asst", "last-scan.json");
    let secretScore = 100;
    let secretDetails = "No scan data found";
    if (existsSync(scanPath)) {
        try {
            const scan = JSON.parse(readFileSync(scanPath, "utf8"));
            const secretResult = scan.results?.find((r) => r.agent === "secret_hygiene_scanner");
            if (secretResult) {
                const hasExposures = secretResult.output?.includes("EXPOSURE") || secretResult.output?.includes("WARNING");
                secretScore = hasExposures ? 30 : 100;
                secretDetails = hasExposures ? "Potential secrets detected in scan" : "No secrets detected";
            }
        }
        catch { /* non-critical */ }
    }
    layers.push({ name: "L1 Secret Hygiene", score: secretScore, grade: computeGrade(secretScore), details: secretDetails });
    // ── L2: Static Analysis (Semgrep) ───────────────────────────────
    let saScore = 100;
    let saDetails = "No SARIF data found";
    const sarifFiles = existsSync(input.assuranceDir)
        ? readdirSync(input.assuranceDir).filter(f => f.endsWith(".sarif.json") || f.includes("sarif"))
        : [];
    if (sarifFiles.length > 0) {
        try {
            const sarif = JSON.parse(readFileSync(join(input.assuranceDir, sarifFiles[0]), "utf8"));
            const resultCount = sarif?.runs?.[0]?.results?.length || 0;
            saScore = Math.max(0, 100 - resultCount * 10);
            saDetails = `${resultCount} static analysis finding(s)`;
        }
        catch { /* non-critical */ }
    }
    layers.push({ name: "L2 Static Analysis", score: saScore, grade: computeGrade(saScore), details: saDetails });
    // ── L3: Chain State ─────────────────────────────────────────────
    const snapshotDir = join(input.assuranceDir, "snapshots");
    let chainScore = 50; // neutral if no data
    let chainDetails = "No on-chain snapshots taken";
    if (existsSync(snapshotDir)) {
        const snapshots = readdirSync(snapshotDir).filter(f => f.endsWith(".json"));
        chainScore = snapshots.length > 0 ? 85 : 50;
        chainDetails = `${snapshots.length} account snapshot(s) captured`;
    }
    layers.push({ name: "L3 Chain State", score: chainScore, grade: computeGrade(chainScore), details: chainDetails });
    // ── L4: DeFi / Rug Pull ─────────────────────────────────────────
    let defiScore = 80;
    let defiDetails = "No DeFi scan data";
    if (existsSync(scanPath)) {
        try {
            const scan = JSON.parse(readFileSync(scanPath, "utf8"));
            const rugResult = scan.results?.find((r) => r.agent === "rug_pull_detector");
            if (rugResult) {
                const hasRiskFlags = rugResult.output?.includes("WARNING") || rugResult.output?.includes("Critical") || rugResult.output?.includes("High");
                defiScore = hasRiskFlags ? 40 : 90;
                defiDetails = hasRiskFlags ? "Risk patterns detected" : "No rug pull patterns detected";
            }
        }
        catch { /* non-critical */ }
    }
    layers.push({ name: "L4 DeFi / Rug Pull", score: defiScore, grade: computeGrade(defiScore), details: defiDetails });
    // ── L5: Supply Chain ────────────────────────────────────────────
    let scScore = 100;
    let scDetails = "No supply chain data";
    const scPath = join(input.assuranceDir, "supply-chain-merged.json");
    if (existsSync(scPath)) {
        try {
            const sc = JSON.parse(readFileSync(scPath, "utf8"));
            const npmTotal = sc?.npm?.vulnerabilities?.total || 0;
            const criticals = sc?.npm?.vulnerabilities?.critical || 0;
            const highs = sc?.npm?.vulnerabilities?.high || 0;
            scScore = Math.max(0, 100 - criticals * 25 - highs * 15 - (npmTotal - criticals - highs) * 5);
            scDetails = `${npmTotal} npm vulnerability(s) — ${criticals} critical, ${highs} high`;
        }
        catch { /* non-critical */ }
    }
    layers.push({ name: "L5 Supply Chain", score: scScore, grade: computeGrade(scScore), details: scDetails });
    // ── L6: Report Coverage ─────────────────────────────────────────
    const manifests = existsSync(input.assuranceDir)
        ? readdirSync(input.assuranceDir).filter(f => /^run-.*\.json$/.test(f))
        : [];
    const reportScore = manifests.length > 0 ? 90 : 50;
    const reportDetails = `${manifests.length} assurance manifest(s) generated`;
    layers.push({ name: "L6 Report Coverage", score: reportScore, grade: computeGrade(reportScore), details: reportDetails });
    // ── Aggregate Score ─────────────────────────────────────────────
    const weights = [0.20, 0.20, 0.15, 0.15, 0.20, 0.10]; // L1-L6 weights
    const overallScore = Math.round(layers.reduce((sum, layer, i) => sum + layer.score * weights[i], 0));
    const overallGrade = computeGrade(overallScore);
    const report = [
        `╔══════════════════════════════════════════╗`,
        `║  UNIFIED SECURITY POSTURE REPORT         ║`,
        `╠══════════════════════════════════════════╣`,
        `║  Overall Score: ${overallScore}/100 (${overallGrade})${" ".repeat(21 - String(overallScore).length - overallGrade.length)}║`,
        `╠══════════════════════════════════════════╣`,
        ...layers.map(l => `║  ${l.grade} | ${l.name.padEnd(22)} ${String(l.score).padStart(3)}/100 ║`),
        `╠══════════════════════════════════════════╣`,
        ...layers.map(l => `║  ${l.name}: ${l.details.substring(0, 35).padEnd(35)}║`),
        `╚══════════════════════════════════════════╝`,
    ].join("\n");
    return report;
}, {
    name: "unified_posture_report",
    description: "Computes a weighted security posture score across 6 layers (secrets, static analysis, chain state, DeFi/rug, supply chain, report coverage) from actual assurance data.",
    schema,
});
