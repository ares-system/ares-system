import { theme } from "../ui/theme.js";
import { renderBanner } from "../ui/components/Banner.js";
import { renderPanel, renderInfoRow } from "../ui/components/Panel.js";
import { renderBadge } from "../ui/components/StatusBadge.js";
import { renderTable } from "../ui/components/Table.js";
import chalk from "chalk";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
export async function diffCommand(options) {
    const c = theme.c;
    const assuranceDir = join(process.cwd(), "assurance");
    // Auto-detect manifests
    let leftPath = options.left;
    let rightPath = options.right;
    if (!leftPath || !rightPath) {
        if (existsSync(assuranceDir)) {
            const manifests = readdirSync(assuranceDir)
                .filter((f) => f.endsWith(".json") && f.startsWith("manifest_"))
                .sort();
            if (manifests.length >= 2) {
                leftPath = leftPath || join(assuranceDir, manifests[manifests.length - 2]);
                rightPath = rightPath || join(assuranceDir, manifests[manifests.length - 1]);
            }
            else if (manifests.length === 1) {
                console.log(renderPanel(chalk.hex(c.yellow)("Only 1 manifest found. Need at least 2 to diff.\n") +
                    chalk.hex(c.textDim)("Run 'asst scan' again to generate a second manifest."), { title: "Diff", borderColor: c.yellow, padding: 1 }));
                return;
            }
            else {
                console.log(renderPanel(chalk.hex(c.red)("No manifests found in assurance/ directory.\n") +
                    chalk.hex(c.textDim)("Run 'asst scan' to generate a manifest first."), { title: "Diff", borderColor: c.red, padding: 1 }));
                return;
            }
        }
        else {
            console.log(renderPanel(chalk.hex(c.red)("No assurance/ directory found.\n") +
                chalk.hex(c.textDim)("Use --left and --right to specify manifest paths."), { title: "Diff", borderColor: c.red, padding: 1 }));
            return;
        }
    }
    // Load manifests
    let left, right;
    try {
        left = JSON.parse(readFileSync(leftPath, "utf8"));
        right = JSON.parse(readFileSync(rightPath, "utf8"));
    }
    catch (e) {
        console.log(renderPanel(chalk.hex(c.red)(`Failed to read manifests:\n${e.message}`), { title: "Error", borderColor: c.red, padding: 1 }));
        return;
    }
    // ─── Header ────────────────────────────────────────────────
    console.log("");
    console.log(renderBanner({
        compact: true,
        subtitle: "Assurance Manifest Diff",
        version: "2.0.0",
        items: [
            { label: "Older", value: basename(leftPath) },
            { label: "Newer", value: basename(rightPath) },
        ],
    }));
    console.log("");
    // ─── Compare Layers ────────────────────────────────────────
    const layers = [
        { name: "Secrets & Hygiene", key: "secret_hygiene" },
        { name: "Static Analysis", key: "static_analysis" },
        { name: "Chain State", key: "chain_state" },
        { name: "DeFi / Rug Risk", key: "defi_rug" },
        { name: "Supply Chain", key: "supply_chain" },
        { name: "Coverage & Testing", key: "coverage" },
    ];
    const diffRows = [];
    let improved = 0, regressed = 0, unchanged = 0;
    for (const layer of layers) {
        const l = getLayerStatus(left, layer.key);
        const r = getLayerStatus(right, layer.key);
        let change;
        if (l === r) {
            change = chalk.hex(c.textDim)("─");
            unchanged++;
        }
        else if (r === "ok" && l !== "ok") {
            change = chalk.hex(c.green)("▲ Improved");
            improved++;
        }
        else if (l === "ok" && r !== "ok") {
            change = chalk.hex(c.red)("▼ Regressed");
            regressed++;
        }
        else {
            change = chalk.hex(c.yellow)("~ Changed");
        }
        diffRows.push([
            layer.name,
            formatStatus(l, c),
            formatStatus(r, c),
            change,
        ]);
    }
    console.log(renderTable({
        title: "Layer Comparison",
        columns: [
            { label: " Layer", width: 22 },
            { label: " Before", width: 12 },
            { label: " After", width: 12 },
            { label: " Change", width: 16 },
        ],
        rows: diffRows,
        borderColor: c.cyanDim,
    }));
    // ─── Summary ───────────────────────────────────────────────
    console.log("");
    const overallBadge = regressed > 0
        ? renderBadge("warn", "REGRESSION")
        : improved > 0
            ? renderBadge("pass", "IMPROVED")
            : renderBadge("info", "NO CHANGE");
    const summaryContent = [
        renderInfoRow("Improved", chalk.hex(c.green)(`${improved}`)),
        renderInfoRow("Regressed", regressed > 0 ? chalk.hex(c.red)(`${regressed}`) : "0"),
        renderInfoRow("Unchanged", `${unchanged}`),
        renderInfoRow("Verdict", overallBadge),
    ].join("\n");
    console.log(renderPanel(summaryContent, {
        title: "Diff Summary",
        borderColor: regressed > 0 ? c.red : improved > 0 ? c.green : c.border,
        padding: 1,
    }));
    console.log("");
}
// ─── Helpers ─────────────────────────────────────────────────
function getLayerStatus(manifest, key) {
    const keyMap = {
        secret_hygiene: ["secrets", "env_hygiene"],
        static_analysis: ["static_analysis", "semgrep"],
        chain_state: ["chain_state", "program_accounts"],
        defi_rug: ["defi", "rug_pull"],
        supply_chain: ["supply_chain", "npm"],
        coverage: ["coverage", "testing"],
    };
    const paths = keyMap[key] || [key];
    for (const p of paths) {
        const val = manifest?.[p]?.status || manifest?.[p];
        if (val)
            return typeof val === "string" ? val : "present";
    }
    return "unknown";
}
function formatStatus(status, c) {
    switch (status) {
        case "ok": return chalk.hex(c.green)(` ${status}`);
        case "error": return chalk.hex(c.red)(` ${status}`);
        case "warning": return chalk.hex(c.yellow)(` ${status}`);
        default: return chalk.hex(c.textDim)(` ${status}`);
    }
}
