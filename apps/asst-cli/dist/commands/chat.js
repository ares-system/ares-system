import * as readline from "node:readline";
import * as path from "node:path";
import { theme } from "../ui/theme.js";
import { renderBanner } from "../ui/components/Banner.js";
import { renderPanel, renderDivider } from "../ui/components/Panel.js";
import { Orchestrator } from "@ares/engine";
import chalk from "chalk";
// ─── Clean Spinner (no flicker) ──────────────────────────────
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
class CleanSpinner {
    frameIndex = 0;
    interval = null;
    currentText = "";
    start(text) {
        this.stop(); // clean up any previous
        this.currentText = text;
        this.frameIndex = 0;
        this.render();
        this.interval = setInterval(() => this.render(), 80);
    }
    render() {
        const frame = chalk.hex(theme.c.cyan)(SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length]);
        process.stdout.write(`\r  ${frame} ${this.currentText}` + " ".repeat(10));
        this.frameIndex++;
    }
    stop(finalText) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        // Clear the spinner line completely
        process.stdout.write("\r" + " ".repeat(80) + "\r");
        if (finalText) {
            console.log(`  ${finalText}`);
        }
    }
}
// ─── Visible Prompt ──────────────────────────────────────────
function prompt(promptText) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(promptText, (answer) => {
            rl.close();
            resolve(answer.trim() || null);
        });
    });
}
// ─── Chat Command ────────────────────────────────────────────
export async function chatCommand(options) {
    const repoRoot = options.repo ? path.resolve(options.repo) : process.cwd();
    const c = theme.c;
    // Prevent MaxListenersExceeded warning
    process.stdin.setMaxListeners(50);
    // ─── Startup Banner ──────────────────────────────────────
    console.clear();
    console.log(renderBanner({
        compact: true,
        subtitle: "Multi-Agent Security Intelligence Shell",
        version: "2.0.0",
        repo: repoRoot,
        model: options.model || process.env.ASST_ORCHESTRATOR_MODEL || "google:gemini-2.5-flash",
        items: [
            { label: "Agents", value: "6 specialized sub-agents" },
            { label: "Mode", value: "Interactive Chat" },
        ],
    }));
    console.log("");
    // ─── Init ────────────────────────────────────────────────
    const spin = new CleanSpinner();
    spin.start(chalk.hex(c.textDim)("Initializing orchestrator..."));
    const orchestrator = new Orchestrator(repoRoot, { model: options.model });
    await orchestrator.init();
    spin.stop(chalk.hex(c.green)("✓") + chalk.hex(c.text)(" Orchestrator ready"));
    console.log(chalk.hex(c.textDim)("  Type your query below. Type 'exit' to quit."));
    console.log("");
    // ─── Chat Loop ───────────────────────────────────────────
    let turnCount = 0;
    const promptStr = chalk.hex(c.cyan).bold("  ❯ ") + chalk.reset("");
    while (true) {
        const userInput = await prompt(promptStr);
        if (!userInput || userInput === "exit" || userInput === "quit") {
            break;
        }
        turnCount++;
        console.log("");
        console.log(chalk.hex(c.textDim)(`  ──── Turn ${turnCount} ────`));
        console.log("");
        const agentSpin = new CleanSpinner();
        try {
            const response = await orchestrator.chat(userInput, (status) => {
                agentSpin.start(chalk.hex(c.text)(status));
            });
            agentSpin.stop(chalk.hex(c.green)("✓") + chalk.hex(c.text)(" Analysis complete"));
            // Render response
            console.log("");
            console.log(renderPanel(response, {
                title: "ARES Response",
                borderColor: c.cyanDim,
                padding: 1,
            }));
            console.log("");
        }
        catch (e) {
            agentSpin.stop(chalk.hex(c.red)("✗") + chalk.hex(c.red)(" Error"));
            console.log("");
            console.log(renderPanel(chalk.hex(c.red)(e.message || "Unknown error occurred"), {
                title: "Error",
                borderColor: c.red,
                padding: 1,
            }));
            console.log("");
        }
    }
    // ─── Goodbye ─────────────────────────────────────────────
    await orchestrator.close();
    console.log("");
    console.log(renderDivider({ label: "Session Ended" }));
    console.log(chalk.hex(c.textDim)(`  ${turnCount} turn(s) completed. Session saved.`));
    console.log("");
}
