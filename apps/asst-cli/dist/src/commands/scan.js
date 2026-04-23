import { intro, outro, spinner } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { Orchestrator } from "../engine/orchestrator.js";
export async function scanCommand(options) {
    const repoRoot = options.repo || process.cwd();
    const orchestrator = new Orchestrator(repoRoot);
    await orchestrator.init();
    if (!options.json) {
        intro(theme.accent(" ASST MULTI-AGENT SECURITY SCAN "));
        console.log(theme.info("Target: ") + theme.repo(repoRoot));
        console.log(theme.info("Architecture: ") + "6 specialized sub-agents\n");
    }
    const laneLabels = {
        secret_hygiene_scanner: "L1  Secret & Hygiene Scanner",
        solana_vulnerability_analyst: "L2  Solana Vulnerability Analyst",
        defi_security_auditor: "L3  DeFi Security Auditor",
        rug_pull_detector: "L4  Rug Pull Detector",
        supply_chain_analyst: "L5  Supply Chain Analyst",
        report_synthesizer: "L6  Report Synthesizer"
    };
    const s = !options.json ? spinner() : null;
    const startTime = Date.now();
    const results = await orchestrator.runFullScan((agentName, status) => {
        const label = laneLabels[agentName] || agentName;
        if (s) {
            if (status === "running") {
                s.start(`${label}...`);
            }
            else if (status === "done") {
                s.stop(theme.accent(`✓ ${label} — complete`));
            }
            else if (status === "error") {
                s.stop(theme.error(`✗ ${label} — failed`));
            }
        }
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (options.json) {
        const jsonOutput = {
            repo: repoRoot,
            timestamp: new Date().toISOString(),
            elapsed_seconds: parseFloat(elapsed),
            results: results.map(r => ({
                agent: r.agent,
                status: r.output.startsWith("[Error]") ? "error" : "ok",
                output: r.output
            }))
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
    }
    else {
        console.log("\n" + theme.accent("═".repeat(60)));
        console.log(theme.accent(" SCAN COMPLETE ") + `  (${elapsed}s, 6 agents)\n`);
        const report = results[results.length - 1];
        if (report) {
            console.log(report.output);
        }
        console.log("\n" + theme.accent("═".repeat(60)));
    }
    try {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const asstDir = path.join(repoRoot, ".asst");
        await fs.mkdir(asstDir, { recursive: true });
        await fs.writeFile(path.join(asstDir, "last-scan.json"), JSON.stringify({
            repo: repoRoot,
            timestamp: new Date().toISOString(),
            results: results.map(r => ({ agent: r.agent, output: r.output }))
        }, null, 2), "utf8");
        if (!options.json) {
            console.log(theme.info("\nResults saved to .asst/last-scan.json"));
        }
    }
    catch {
        // Non-critical
    }
    await orchestrator.close();
    if (!options.json) {
        outro(theme.brand(" Scan complete. Stay secure! "));
    }
}
