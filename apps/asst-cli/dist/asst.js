#!/usr/bin/env node
import dotenv from "dotenv";
import path from "node:path";
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), "..", "..", ".env.local") });
import { Command } from "commander";
import { text, isCancel } from "@clack/prompts";
import { theme } from "./ui/theme.js";
import { renderBanner } from "./ui/components/Banner.js";
import { renderPanel } from "./ui/components/Panel.js";
import { scanCommand } from "./commands/scan.js";
import { chatCommand } from "./commands/chat.js";
import { skillsCommand } from "./commands/skills.js";
import { diffCommand } from "./commands/diff.js";
import { watchCommand } from "./commands/watch.js";
import fs from "node:fs";
import chalk from "chalk";
// -- Config Management --
const CONFIG_PATH = path.join(process.cwd(), ".asst", "config.json");
function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        }
        catch {
            return {};
        }
    }
    return {};
}
function saveConfig(config) {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
async function ensureConfig() {
    const c = theme.c;
    if (!process.env.GOOGLE_API_KEY) {
        console.log("");
        console.log(renderPanel(chalk.hex(c.yellow)("No GOOGLE_API_KEY found.\n\n") +
            chalk.hex(c.text)("ASST requires a Google AI Studio key for the orchestrator.\n") +
            chalk.hex(c.cyan)("Get one at: https://aistudio.google.com/apikey"), { title: "Configuration Required", borderColor: c.yellow, padding: 1 }));
        console.log("");
        const apiKey = await text({
            message: chalk.hex(c.cyan)("❯") + " Enter your Google API Key:",
            placeholder: "AIzaSy...",
            validate: (value) => {
                if (!value)
                    return "API Key is required.";
            }
        });
        if (isCancel(apiKey) || !apiKey) {
            console.log(chalk.hex(c.red)("\n  Configuration cancelled.\n"));
            process.exit(1);
        }
        const envPath = path.join(process.cwd(), ".env.local");
        fs.appendFileSync(envPath, `\nGOOGLE_API_KEY=${apiKey}\n`);
        process.env.GOOGLE_API_KEY = apiKey;
        console.log(chalk.hex(c.green)(`  ✓ Key saved to ${envPath}\n`));
    }
}
const program = new Command();
const config = loadConfig();
program
    .name("asst")
    .description("ARES — Automated Resilience Evaluation System")
    .version("2.0.0");
program
    .command("init")
    .description("Configure ASST environment (API Keys)")
    .action(async () => {
    await ensureConfig();
    console.log(renderPanel(chalk.hex(theme.c.green)("✓ Initialization complete!"), { title: "Init", borderColor: theme.c.green, padding: 1 }));
});
program
    .command("scan")
    .description("Run a deterministic 6-agent security scan")
    .option("-r, --repo <path>", "Path to project root (default: current directory)")
    .option("--json", "Output raw JSON for CI/CD pipelines")
    .action(async (options) => {
    try {
        await ensureConfig();
        await scanCommand({ repo: options.repo, json: options.json });
    }
    catch (error) {
        console.log(renderPanel(chalk.hex(theme.c.red)(error.message), { title: "Scan Error", borderColor: theme.c.red, padding: 1 }));
        process.exit(1);
    }
});
program
    .command("chat")
    .description("Start an interactive multi-agent chat session")
    .option("-m, --model <model>", "Override orchestrator model")
    .option("-r, --repo <path>", "Path to target repository (default: current directory)")
    .action(async (options) => {
    try {
        await ensureConfig();
        const model = options.model || config.model || "gemini-2.5-flash";
        const repo = options.repo || process.env.ARES_REPO_ROOT || undefined;
        await chatCommand({ model, repo });
    }
    catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            console.log(renderPanel(chalk.hex(theme.c.red)("Module Loading Error\n\n") +
                chalk.hex(theme.c.text)("One of the internal components could not be loaded.\n") +
                chalk.hex(theme.c.textDim)("Try running 'pnpm install' or check the file paths."), { title: "Error", borderColor: theme.c.red, padding: 1 }));
        }
        else {
            console.log(renderPanel(chalk.hex(theme.c.red)(error.message), { title: "Chat Error", borderColor: theme.c.red, padding: 1 }));
        }
        console.log(chalk.hex(theme.c.textDim)("\n  Press Enter to close...\n"));
        process.stdin.setRawMode(false);
        process.stdin.resume();
        await new Promise(resolve => process.stdin.once("data", resolve));
        process.exit(1);
    }
});
program
    .command("skills")
    .description("List and inspect installed blockint skills")
    .option("-i, --info <name>", "Show details for a specific skill")
    .action(async (options) => {
    try {
        await skillsCommand({ info: options.info });
    }
    catch (error) {
        console.log(renderPanel(chalk.hex(theme.c.red)(error.message), { title: "Skills Error", borderColor: theme.c.red, padding: 1 }));
    }
});
program
    .command("diff")
    .description("Compare two assurance manifests side-by-side")
    .option("-l, --left <path>", "Path to the older manifest")
    .option("-r, --right <path>", "Path to the newer manifest")
    .action(async (options) => {
    try {
        await diffCommand({ left: options.left, right: options.right });
    }
    catch (error) {
        console.log(renderPanel(chalk.hex(theme.c.red)(error.message), { title: "Diff Error", borderColor: theme.c.red, padding: 1 }));
    }
});
program
    .command("watch")
    .description("Continuously monitor files for security issues")
    .option("-r, --repo <path>", "Path to project root (default: current directory)")
    .option("-i, --interval <ms>", "Check interval in milliseconds (default: 2000)", parseInt)
    .action(async (options) => {
    try {
        await watchCommand({ repo: options.repo, interval: options.interval });
    }
    catch (error) {
        console.log(renderPanel(chalk.hex(theme.c.red)(error.message), { title: "Watch Error", borderColor: theme.c.red, padding: 1 }));
    }
});
// ─── Main ────────────────────────────────────────────────────
async function main() {
    try {
        if (process.argv.length <= 2) {
            // No command — show banner and interactive command picker
            console.clear();
            console.log(renderBanner({
                subtitle: "Automated Resilience Evaluation System",
                version: "2.0.0",
                items: [
                    { label: "Docs", value: "https://github.com/ASST" },
                ],
            }));
            console.log("");
            const c = theme.c;
            const { select } = await import("@clack/prompts");
            const chosen = await select({
                message: chalk.hex(c.cyan).bold("Select a command"),
                options: [
                    { value: "chat", label: chalk.hex(c.white)("💬  Chat"), hint: "Interactive AI-powered security chat" },
                    { value: "scan", label: chalk.hex(c.white)("🔍  Scan"), hint: "Full 6-agent deterministic security scan" },
                    { value: "watch", label: chalk.hex(c.white)("👁   Watch"), hint: "Continuous real-time file monitoring" },
                    { value: "diff", label: chalk.hex(c.white)("📊  Diff"), hint: "Compare assurance manifests" },
                    { value: "skills", label: chalk.hex(c.white)("🧠  Skills"), hint: "List installed intelligence skills" },
                    { value: "init", label: chalk.hex(c.white)("⚙️   Init"), hint: "Configure API keys and environment" },
                ],
            });
            if (typeof chosen === "symbol" || !chosen) {
                console.log(chalk.hex(c.textDim)("\n  Goodbye.\n"));
                return;
            }
            console.log("");
            switch (chosen) {
                case "chat":
                    await ensureConfig();
                    await chatCommand({ model: config.model || "gemini-2.5-flash", repo: process.env.ARES_REPO_ROOT });
                    break;
                case "scan":
                    await ensureConfig();
                    await scanCommand({ repo: process.env.ARES_REPO_ROOT });
                    break;
                case "watch":
                    await watchCommand({});
                    break;
                case "diff":
                    await diffCommand({});
                    break;
                case "skills":
                    await skillsCommand({});
                    break;
                case "init":
                    await ensureConfig();
                    console.log(renderPanel(chalk.hex(c.green)("✓ Initialization complete!"), { title: "Init", borderColor: c.green, padding: 1 }));
                    break;
            }
        }
        else {
            await program.parseAsync(process.argv);
        }
    }
    catch (error) {
        console.log(renderPanel(chalk.hex(theme.c.red)(error.message), { title: "Fatal Error", borderColor: theme.c.red, padding: 1 }));
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}
main();
