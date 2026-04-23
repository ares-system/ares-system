import { spinner } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { renderBanner } from "../ui/components/Banner.js";
import { renderPanel, renderDivider, renderInfoRow } from "../ui/components/Panel.js";
import { renderBadge, renderAgentLane, renderProgressBar } from "../ui/components/StatusBadge.js";
import { Orchestrator } from "@ares/engine";
import chalk from "chalk";
import * as path from "node:path";
export async function scanCommand(options) {
    const repoRoot = options.repo ? path.resolve(options.repo) : process.cwd();
    const c = theme.c;
    // JSON mode — skip all TUI
    if (options.json) {
        return runJsonScan(repoRoot);
    }
    // ─── Startup Banner ────────────────────────────────────────
    console.clear();
    console.log(renderBanner({
        compact: true,
        subtitle: "Deterministic Security Scan",
        version: "2.0.0",
        repo: repoRoot,
        items: [
            { label: "Agents", value: "6 specialized sub-agents" },
            { label: "Mode", value: "Full Scan (parallel)" },
        ],
    }));
    console.log("");
    // ─── Agent Setup ───────────────────────────────────────────
    const lanes = {
        secret_hygiene_scanner: { label: "L1  Secret & Hygiene Scanner", status: "pending" },
        solana_vulnerability_analyst: { label: "L2  Solana Vulnerability Analyst", status: "pending" },
        defi_security_auditor: { label: "L3  DeFi Security Auditor", status: "pending" },
        rug_pull_detector: { label: "L4  Rug Pull Detector", status: "pending" },
        supply_chain_analyst: { label: "L5  Supply Chain Analyst", status: "pending" },
        report_synthesizer: { label: "L6  Report Synthesizer", status: "pending" },
    };
    // Initial render of agent dashboard
    function renderDashboard() {
        const dashLines = [];
        for (const [name, lane] of Object.entries(lanes)) {
            let timeStr;
            if (lane.endTime && lane.startTime) {
                timeStr = `${((lane.endTime - lane.startTime) / 1000).toFixed(1)}s`;
            }
            else if (lane.startTime) {
                timeStr = `${((Date.now() - lane.startTime) / 1000).toFixed(0)}s...`;
            }
            dashLines.push(renderAgentLane({
                name,
                label: lane.label,
                status: lane.status,
                time: timeStr,
            }));
        }
        return dashLines.join("\n");
    }
    console.log(renderPanel(renderDashboard(), {
        title: "Agent Execution",
        borderColor: c.cyanDim,
        padding: 0,
    }));
    // ─── Execute Scan ──────────────────────────────────────────
    const orchestrator = new Orchestrator(repoRoot);
    await orchestrator.init();
    const s = spinner();
    const startTime = Date.now();
    let completedCount = 0;
    const totalAgents = Object.keys(lanes).length;
    const results = await orchestrator.runFullScan((agentName, status) => {
        if (lanes[agentName]) {
            if (status === "running") {
                lanes[agentName].status = "running";
                lanes[agentName].startTime = Date.now();
                s.start(chalk.hex(c.purple)("◎ ") + chalk.hex(c.text)(lanes[agentName].label + "..."));
            }
            else if (status === "done") {
                lanes[agentName].status = "done";
                lanes[agentName].endTime = Date.now();
                completedCount++;
                const elapsed = ((lanes[agentName].endTime - lanes[agentName].startTime) / 1000).toFixed(1);
                s.stop(chalk.hex(c.green)("✓") + chalk.hex(c.text)(` ${lanes[agentName].label}`) + chalk.hex(c.textDim)(` (${elapsed}s)`));
                // Progress
                console.log(renderProgressBar(completedCount, totalAgents));
            }
            else if (status === "error") {
                lanes[agentName].status = "error";
                lanes[agentName].endTime = Date.now();
                completedCount++;
                s.stop(chalk.hex(c.red)("✗") + chalk.hex(c.red)(` ${lanes[agentName].label} — failed`));
                console.log(renderProgressBar(completedCount, totalAgents));
            }
        }
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    // ─── Results Dashboard ─────────────────────────────────────
    console.log("");
    console.log(renderDivider({ label: "Scan Complete" }));
    console.log("");
    // Summary panel
    const passCount = Object.values(lanes).filter(l => l.status === "done").length;
    const failCount = Object.values(lanes).filter(l => l.status === "error").length;
    const overallBadge = failCount === 0 ? renderBadge("pass") : renderBadge("warn");
    const summaryContent = [
        renderInfoRow("Duration", `${elapsed}s`),
        renderInfoRow("Agents Run", `${totalAgents}`),
        renderInfoRow("Passed", chalk.hex(c.green)(`${passCount}`)),
        renderInfoRow("Failed", failCount > 0 ? chalk.hex(c.red)(`${failCount}`) : "0"),
        renderInfoRow("Status", overallBadge),
    ].join("\n");
    console.log(renderPanel(summaryContent, {
        title: "Scan Summary",
        borderColor: failCount > 0 ? c.yellow : c.green,
        padding: 1,
    }));
    // Final report
    const report = results[results.length - 1];
    if (report) {
        console.log("");
        console.log(renderPanel(report.output, {
            title: "Security Report",
            borderColor: c.cyanDim,
            padding: 1,
        }));
    }
    // Save results
    try {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const asstDir = path.join(repoRoot, ".asst");
        await fs.mkdir(asstDir, { recursive: true });
        await fs.writeFile(path.join(asstDir, "last-scan.json"), JSON.stringify({
            repo: repoRoot,
            timestamp: new Date().toISOString(),
            elapsed: elapsed,
            results: results.map((r) => ({ agent: r.agent, output: r.output }))
        }, null, 2), "utf8");
        console.log("");
        console.log(chalk.hex(c.textDim)("  Results saved to .asst/last-scan.json"));
    }
    catch { /* non-critical */ }
    await orchestrator.close();
    console.log("");
}
// ─── JSON Mode (CI/CD) ────────────────────────────────────────
async function runJsonScan(repoRoot) {
    const orchestrator = new Orchestrator(repoRoot);
    await orchestrator.init();
    const startTime = Date.now();
    const results = await orchestrator.runFullScan(() => { });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const jsonOutput = {
        repo: repoRoot,
        timestamp: new Date().toISOString(),
        elapsed_seconds: parseFloat(elapsed),
        results: results.map((r) => ({
            agent: r.agent,
            status: r.output.startsWith("[Error]") ? "error" : "ok",
            output: r.output
        }))
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    await orchestrator.close();
}
