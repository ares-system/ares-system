import { theme } from "../ui/theme.js";
import { renderBanner } from "../ui/components/Banner.js";
import { renderPanel, renderInfoRow } from "../ui/components/Panel.js";
import { renderBadge, statusIcon } from "../ui/components/StatusBadge.js";
import chalk from "chalk";
import { watch as fsWatch, existsSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { createHash } from "node:crypto";
// ─── File Hash Tracker ──────────────────────────────────────
const fileHashes = new Map();
function hashFile(filePath) {
    try {
        const content = readFileSync(filePath, "utf8");
        return createHash("sha256").update(content).digest("hex").substring(0, 16);
    }
    catch {
        return "";
    }
}
function isWatchableFile(file, patterns) {
    return patterns.includes(extname(file).toLowerCase());
}
// ─── Quick Security Checks ──────────────────────────────────
const SECRET_PATTERNS = [
    { name: "AWS Key", regex: /AKIA[0-9A-Z]{16}/g },
    { name: "Private Key Block", regex: /-----BEGIN\s+(RSA|EC|OPENSSH|PGP)\s+PRIVATE\sKEY-----/g },
    { name: "Solana Key (base58, 64+)", regex: /[1-9A-HJ-NP-Za-km-z]{64,}/g },
    { name: "Bearer Token", regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g },
    { name: "API Key Assignment", regex: /(?:api_?key|apikey|api_?secret)\s*[=:]\s*['"][^'"]{8,}['"]/gi },
];
function quickSecretScan(filePath) {
    const details = [];
    try {
        const content = readFileSync(filePath, "utf8");
        for (const pattern of SECRET_PATTERNS) {
            const matches = content.match(pattern.regex);
            if (matches) {
                details.push(`${pattern.name} (${matches.length} occurrence(s))`);
            }
        }
    }
    catch { /* unreadable */ }
    return { found: details.length > 0, details };
}
const RUST_PATTERNS = [
    { name: "UncheckedAccount", regex: /UncheckedAccount/g },
    { name: "unwrap()", regex: /\.unwrap\(\)/g },
    { name: "TODO/FIXME", regex: /\/\/\s*(TODO|FIXME|HACK|UNSAFE)/gi },
];
function quickRustScan(filePath) {
    const details = [];
    try {
        const content = readFileSync(filePath, "utf8");
        for (const pattern of RUST_PATTERNS) {
            const matches = content.match(pattern.regex);
            if (matches)
                details.push(`${pattern.name} (${matches.length})`);
        }
    }
    catch { /* unreadable */ }
    return { found: details.length > 0, details };
}
// ─── Watch Command ──────────────────────────────────────────
export async function watchCommand(options) {
    const repoRoot = options.repo || process.cwd();
    const patterns = options.patterns || [".rs", ".ts", ".tsx", ".js", ".json", ".toml", ".env"];
    const c = theme.c;
    // ─── Startup ─────────────────────────────────────────────
    console.clear();
    console.log(renderBanner({
        compact: true,
        subtitle: "Continuous Security Monitor",
        version: "2.0.0",
        repo: repoRoot,
        items: [
            { label: "Watching", value: patterns.join(", ") },
            { label: "Mode", value: "Real-time file monitoring" },
        ],
    }));
    console.log("");
    console.log(chalk.hex(c.textDim)("  Press Ctrl+C to stop.\n"));
    let eventCount = 0;
    let secretAlerts = 0;
    let rustIssues = 0;
    const recentEvents = [];
    // ─── Status Display ──────────────────────────────────────
    const statusInterval = setInterval(() => {
        const uptime = Math.floor(process.uptime());
        const min = Math.floor(uptime / 60);
        const sec = uptime % 60;
        const statusParts = [
            chalk.hex(c.cyan)("◎"),
            chalk.hex(c.textDim)(`${min}m ${sec}s`),
            chalk.hex(c.border)("│"),
            chalk.hex(c.text)(`${eventCount}`),
            chalk.hex(c.textDim)("events"),
            chalk.hex(c.border)("│"),
            secretAlerts > 0
                ? chalk.hex(c.red)(`${secretAlerts} alerts`)
                : chalk.hex(c.green)("0 alerts"),
        ];
        process.stdout.write(`\r  ${statusParts.join(" ")}   `);
    }, 1000);
    // ─── Directory Watcher ───────────────────────────────────
    const dirsToWatch = [repoRoot];
    for (const subdir of ["programs", "src", "app", "lib", "tests"]) {
        const fullPath = join(repoRoot, subdir);
        if (existsSync(fullPath))
            dirsToWatch.push(fullPath);
    }
    const watchers = [];
    for (const dir of dirsToWatch) {
        try {
            const watcher = fsWatch(dir, { recursive: true }, (eventType, filename) => {
                if (!filename)
                    return;
                const filePath = join(dir, filename);
                if (!isWatchableFile(filename, patterns))
                    return;
                if (filename.includes("node_modules") || filename.includes(".git") ||
                    filename.includes("target") || filename.includes("dist"))
                    return;
                const newHash = hashFile(filePath);
                const oldHash = fileHashes.get(filePath);
                if (newHash === oldHash)
                    return;
                fileHashes.set(filePath, newHash);
                eventCount++;
                const relPath = relative(repoRoot, filePath);
                const time = new Date().toISOString().substring(11, 19);
                let alertCount = 0;
                // Clear status line
                process.stdout.write("\r" + " ".repeat(80) + "\r");
                // Event header
                console.log(chalk.hex(c.textDim)(`  ${time}`) + "  " +
                    statusIcon("pass") + "  " +
                    chalk.hex(c.text)(`${eventType}: `) +
                    chalk.hex(c.cyan)(relPath));
                // Secret scan
                const secretResult = quickSecretScan(filePath);
                if (secretResult.found) {
                    secretAlerts++;
                    alertCount++;
                    console.log("         " +
                        renderBadge("critical", "SECRET") + " " +
                        chalk.hex(c.red)(secretResult.details.join(", ")));
                }
                // Rust scan
                const ext = extname(filename).toLowerCase();
                if (ext === ".rs") {
                    const rustResult = quickRustScan(filePath);
                    if (rustResult.found) {
                        rustIssues++;
                        console.log("         " +
                            renderBadge("warn", "RUST") + " " +
                            chalk.hex(c.yellow)(rustResult.details.join(", ")));
                    }
                }
                recentEvents.push({ type: eventType, file: relPath, time, alerts: alertCount });
                if (recentEvents.length > 50)
                    recentEvents.shift();
            });
            watchers.push(watcher);
        }
        catch (err) {
            console.log(chalk.hex(c.yellow)(`  ⚠ Could not watch ${dir}: ${err.message}`));
        }
    }
    // ─── Graceful Shutdown ───────────────────────────────────
    const cleanup = () => {
        clearInterval(statusInterval);
        watchers.forEach(w => w.close());
        process.stdout.write("\r" + " ".repeat(80) + "\r");
        console.log("");
        // Summary panel
        const summaryContent = [
            renderInfoRow("Events", `${eventCount}`),
            renderInfoRow("Secret Alerts", secretAlerts > 0 ? chalk.hex(c.red)(`${secretAlerts}`) : "0"),
            renderInfoRow("Rust Issues", rustIssues > 0 ? chalk.hex(c.yellow)(`${rustIssues}`) : "0"),
        ].join("\n");
        console.log(renderPanel(summaryContent, {
            title: "Watch Session Summary",
            borderColor: secretAlerts > 0 ? c.red : c.green,
            padding: 1,
        }));
        // Recent events
        if (recentEvents.length > 0) {
            const lastEvents = recentEvents.slice(-5).map(evt => {
                const alertEmoji = evt.alerts > 0 ? chalk.hex(c.red)(" ⚠") : "";
                return `  ${chalk.hex(c.textDim)(evt.time)}  ${chalk.hex(c.text)(evt.file)}${alertEmoji}`;
            }).join("\n");
            console.log("");
            console.log(renderPanel(lastEvents, {
                title: "Last 5 Events",
                borderColor: c.border,
                padding: 0,
            }));
        }
        console.log("");
        process.exit(0);
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    await new Promise(() => { });
}
