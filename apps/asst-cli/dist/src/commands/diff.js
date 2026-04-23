import { intro, outro, spinner } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
function loadManifest(filePath) {
    if (!existsSync(filePath))
        return null;
    try {
        return JSON.parse(readFileSync(filePath, "utf8"));
    }
    catch {
        return null;
    }
}
function diffManifests(a, b) {
    const results = [];
    // Compare static analysis
    const aStatus = a?.static_analysis?.semgrep?.status || "unknown";
    const bStatus = b?.static_analysis?.semgrep?.status || "unknown";
    results.push({
        layer: "Static Analysis (Semgrep)",
        status: aStatus === bStatus ? "unchanged" : bStatus === "ok" ? "improved" : "regressed",
        before: aStatus,
        after: bStatus
    });
    // Compare supply chain (rust)
    const aRust = a?.supply_chain?.rust?.status || a?.rust?.status || "unknown";
    const bRust = b?.supply_chain?.rust?.status || b?.rust?.status || "unknown";
    results.push({
        layer: "Rust Supply Chain",
        status: aRust === bRust ? "unchanged" : bRust === "ok" ? "improved" : "regressed",
        before: aRust,
        after: bRust
    });
    // Compare git info
    const aCommit = a?.git?.commit_sha?.substring(0, 7) || "unknown";
    const bCommit = b?.git?.commit_sha?.substring(0, 7) || "unknown";
    results.push({
        layer: "Git Commit",
        status: aCommit === bCommit ? "unchanged" : "new",
        before: aCommit,
        after: bCommit
    });
    // Compare agent counts (from scan results)
    const aAgents = a?.agent_count || a?.results?.length || 0;
    const bAgents = b?.agent_count || b?.results?.length || 0;
    results.push({
        layer: "Agent Coverage",
        status: aAgents === bAgents ? "unchanged" : bAgents > aAgents ? "improved" : "regressed",
        before: `${aAgents} agents`,
        after: `${bAgents} agents`
    });
    return results;
}
export async function diffCommand(options) {
    const assuranceDir = join(process.cwd(), "assurance");
    intro(theme.accent(" ASST MANIFEST DIFF "));
    if (!existsSync(assuranceDir)) {
        console.log(theme.error("No assurance/ directory found. Run a scan first."));
        outro("");
        return;
    }
    // Get manifest files sorted by date
    const manifestFiles = readdirSync(assuranceDir)
        .filter(f => /^run-.*\.json$/.test(f))
        .sort();
    if (manifestFiles.length < 2 && !options.left) {
        console.log(theme.error("Need at least 2 manifests to diff. Run multiple scans first."));
        console.log(theme.info(`Found ${manifestFiles.length} manifest(s) in assurance/`));
        outro("");
        return;
    }
    const s = spinner();
    s.start("Loading manifests...");
    let leftManifest;
    let rightManifest;
    let leftLabel;
    let rightLabel;
    if (options.left && options.right) {
        leftManifest = loadManifest(options.left);
        rightManifest = loadManifest(options.right);
        leftLabel = options.left;
        rightLabel = options.right;
    }
    else {
        // Auto-compare last two
        const leftFile = manifestFiles[manifestFiles.length - 2];
        const rightFile = manifestFiles[manifestFiles.length - 1];
        leftManifest = loadManifest(join(assuranceDir, leftFile));
        rightManifest = loadManifest(join(assuranceDir, rightFile));
        leftLabel = leftFile;
        rightLabel = rightFile;
    }
    if (!leftManifest || !rightManifest) {
        s.stop(theme.error("Failed to load one or both manifests."));
        outro("");
        return;
    }
    const diffs = diffManifests(leftManifest, rightManifest);
    s.stop(theme.accent("✓ Diff computed"));
    // Display header
    console.log("\n" + theme.info("Comparing:"));
    console.log(`  ${theme.repo("OLD")} ${leftLabel}`);
    console.log(`  ${theme.repo("NEW")} ${rightLabel}\n`);
    // Display diff table
    const statusSymbol = {
        improved: "🟢 IMPROVED",
        regressed: "🔴 REGRESSED",
        unchanged: "⚪ UNCHANGED",
        new: "🔵 CHANGED",
        removed: "🟠 REMOVED"
    };
    console.log("┌──────────────────────────────────┬──────────────┬──────────────┬──────────────┐");
    console.log("│ Layer                            │ Before       │ After        │ Status       │");
    console.log("├──────────────────────────────────┼──────────────┼──────────────┼──────────────┤");
    for (const d of diffs) {
        const name = d.layer.padEnd(32);
        const before = d.before.padEnd(12);
        const after = d.after.padEnd(12);
        const status = (statusSymbol[d.status] || d.status).padEnd(12);
        console.log(`│ ${name} │ ${before} │ ${after} │ ${status} │`);
    }
    console.log("└──────────────────────────────────┴──────────────┴──────────────┴──────────────┘");
    // Summary
    const improved = diffs.filter(d => d.status === "improved").length;
    const regressed = diffs.filter(d => d.status === "regressed").length;
    console.log("");
    if (regressed > 0) {
        console.log(theme.error(`⚠ ${regressed} layer(s) regressed — review before merging.`));
    }
    else if (improved > 0) {
        console.log(theme.accent(`✓ ${improved} layer(s) improved, no regressions.`));
    }
    else {
        console.log(theme.info("No security posture changes detected."));
    }
    outro(theme.brand(" Diff complete "));
}
