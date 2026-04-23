#!/usr/bin/env node
import dotenv from "dotenv";
import path from "node:path";
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), "..", "..", ".env.local") });
import { Command } from "commander";
import { intro, outro, text } from "@clack/prompts";
import { theme } from "./ui/theme.js";
import { scanCommand } from "./commands/scan.js";
import { chatCommand } from "./commands/chat.js";
import { skillsCommand } from "./commands/skills.js";
import { diffCommand } from "./commands/diff.js";
import { watchCommand } from "./commands/watch.js";
import fs from "node:fs";
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
    // Multi-agent architecture requires GOOGLE_API_KEY for orchestrator
    if (!process.env.GOOGLE_API_KEY) {
        intro(theme.brand(" ASST Configuration Needed "));
        console.log(theme.info("No GOOGLE_API_KEY found. ASST requires a Google AI Studio key for the orchestrator."));
        console.log(theme.info("Get one at: https://aistudio.google.com/apikey\n"));
        const apiKey = await text({
            message: "Enter your Google API Key:",
            placeholder: "AIzaSy...",
            validate: (value) => {
                if (!value)
                    return "API Key is required.";
            }
        });
        if (typeof apiKey === "symbol" || !apiKey) {
            console.log(theme.error("Configuration cancelled."));
            process.exit(1);
        }
        const envPath = path.join(process.cwd(), ".env.local");
        fs.appendFileSync(envPath, `\nGOOGLE_API_KEY=${apiKey}\n`);
        process.env.GOOGLE_API_KEY = apiKey;
        console.log(theme.accent(`Key saved to ${envPath}`));
    }
}
const program = new Command();
const config = loadConfig();
program
    .name("asst")
    .description(theme.brand("ASST Terminal") + " - ARES Solana Security Tool (Multi-Agent)")
    .version("2.0.0");
program
    .command("init")
    .description("Configure ASST environment (API Keys)")
    .action(async () => {
    intro(theme.brand(" ASST Terminal: Initialization "));
    await ensureConfig();
    outro(theme.accent("Initialization complete!"));
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
        console.error("\n" + theme.error("Scan Error:") + " " + error.message);
        process.exit(1);
    }
});
program
    .command("chat")
    .description("Start an interactive multi-agent chat session")
    .option("-m, --model <model>", "Override orchestrator model")
    .action(async (options) => {
    try {
        await ensureConfig();
        const model = options.model || config.model || "gemini-2.5-flash";
        await chatCommand({ model });
    }
    catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            console.error(theme.error("\nModule Loading Error: ") + "One of the internal components could not be loaded.");
            console.log(theme.info("Try running 'npm install' or check the file paths."));
        }
        else {
            console.error("\n" + theme.error("Chat Error:") + " " + error.message);
        }
        // Keep terminal open on error
        console.log(theme.accent("\n[DEBUG] Press Enter to close this window..."));
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
        console.error("\n" + theme.error("Skills Error:") + " " + error.message);
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
        console.error("\n" + theme.error("Diff Error:") + " " + error.message);
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
        console.error("\n" + theme.error("Watch Error:") + " " + error.message);
    }
});
async function main() {
    try {
        // Default to chat if no command specified
        if (process.argv.length <= 2) {
            await ensureConfig();
            await chatCommand({ model: config.model || "gemini-2.5-flash" });
        }
        else {
            await program.parseAsync(process.argv);
        }
    }
    catch (error) {
        console.error(theme.error("Fatal Execution Error:"), error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}
main();
