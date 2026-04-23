import { intro, outro, log } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { watch as fsWatch, existsSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { createHash } from "node:crypto";
// ─── File Hash Tracker ──────────────────────────────────────────────
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
    const ext = extname(file).toLowerCase();
    return patterns.includes(ext);
}
// ─── Quick Security Checks ──────────────────────────────────────────
const QUICK_SECRET_PATTERNS = [
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
        for (const pattern of QUICK_SECRET_PATTERNS) {
            const matches = content.match(pattern.regex);
            if (matches) {
                details.push(`  ⚠ ${pattern.name} found (${matches.length} occurrence(s))`);
            }
        }
    }
    catch { /* unreadable file */ }
    return { found: details.length > 0, details };
}
const RUST_DANGER_PATTERNS = [
    { name: "UncheckedAccount", regex: /UncheckedAccount/g },
    { name: "unwrap()", regex: /\.unwrap\(\)/g },
    { name: "TODO/FIXME", regex: /\/\/\s*(TODO|FIXME|HACK|UNSAFE)/gi },
];
function quickRustScan(filePath) {
    const details = [];
    try {
        const content = readFileSync(filePath, "utf8");
        for (const pattern of RUST_DANGER_PATTERNS) {
            const matches = content.match(pattern.regex);
            if (matches) {
                details.push(`  ⚠ ${pattern.name} (${matches.length})`);
            }
        }
    }
    catch { /* unreadable */ }
    return { found: details.length > 0, details };
}
// ─── Watch Command ──────────────────────────────────────────────────
export async function watchCommand(options) {
    const repoRoot = options.repo || process.cwd();
    const interval = options.interval || 2000;
    const patterns = options.patterns || [".rs", ".ts", ".tsx", ".js", ".json", ".toml", ".env"];
    intro(theme.accent(" ASST WATCH MODE "));
    console.log(theme.info("Target: ") + theme.repo(repoRoot));
    console.log(theme.info("Watching: ") + patterns.join(", "));
    console.log(theme.info("Interval: ") + `${interval}ms`);
    console.log(theme.info("\nPress Ctrl+C to stop.\n"));
    let eventCount = 0;
    let secretAlerts = 0;
    const recentEvents = [];
    // ─── Status Display ─────────────────────────────────────────────
    const statusInterval = setInterval(() => {
        const uptime = Math.floor(process.uptime());
        const min = Math.floor(uptime / 60);
        const sec = uptime % 60;
        process.stdout.write(`\r${theme.info(`⏱ ${min}m ${sec}s`)} | Events: ${eventCount} | Alerts: ${secretAlerts > 0 ? theme.error(String(secretAlerts)) : "0"} `);
    }, 1000);
    // ─── Directory Watcher ──────────────────────────────────────────
    const dirsToWatch = [repoRoot];
    // Also watch common subdirs
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
                // Skip non-watchable files
                if (!isWatchableFile(filename, patterns))
                    return;
                // Skip node_modules, .git, target, dist
                if (filename.includes("node_modules") || filename.includes(".git") ||
                    filename.includes("target") || filename.includes("dist"))
                    return;
                // Check if file actually changed (debounce)
                const newHash = hashFile(filePath);
                const oldHash = fileHashes.get(filePath);
                if (newHash === oldHash)
                    return;
                fileHashes.set(filePath, newHash);
                eventCount++;
                const relPath = relative(repoRoot, filePath);
                const timestamp = new Date().toISOString();
                recentEvents.push({ type: eventType, file: relPath, timestamp });
                if (recentEvents.length > 50)
                    recentEvents.shift();
                // Clear status line and print event
                process.stdout.write("\r" + " ".repeat(80) + "\r");
                console.log(theme.accent(`[${timestamp.substring(11, 19)}]`) + ` ${eventType}: ${relPath}`);
                // Quick security scan on change
                const ext = extname(filename).toLowerCase();
                // Secret scan for all text files
                const secretResult = quickSecretScan(filePath);
                if (secretResult.found) {
                    secretAlerts++;
                    console.log(theme.error("  🔐 POTENTIAL SECRET EXPOSURE:"));
                    secretResult.details.forEach(d => console.log(theme.error(d)));
                }
                // Rust-specific scan
                if (ext === ".rs") {
                    const rustResult = quickRustScan(filePath);
                    if (rustResult.found) {
                        console.log(theme.info("  🦀 Rust issues:"));
                        rustResult.details.forEach(d => console.log(d));
                    }
                }
            });
            watchers.push(watcher);
        }
        catch (err) {
            log.warn(`Could not watch ${dir}: ${err.message}`);
        }
    }
    // ─── Graceful Shutdown ──────────────────────────────────────────
    const cleanup = () => {
        clearInterval(statusInterval);
        watchers.forEach(w => w.close());
        process.stdout.write("\r" + " ".repeat(80) + "\r");
        console.log("\n");
        console.log(theme.info(`Session summary: ${eventCount} events, ${secretAlerts} security alerts`));
        if (recentEvents.length > 0) {
            console.log(theme.info("\nLast 5 events:"));
            for (const evt of recentEvents.slice(-5)) {
                console.log(`  ${evt.timestamp.substring(11, 19)} ${evt.type}: ${evt.file}`);
            }
        }
        outro(theme.brand(" Watch session ended "));
        process.exit(0);
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    // Keep process alive
    await new Promise(() => { });
}
