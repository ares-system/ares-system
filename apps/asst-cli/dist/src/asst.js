#!/usr/bin/env node
import { Command } from "commander";
import { intro, outro } from "@clack/prompts";
import { theme } from "./ui/theme.js";
import { scanCommand } from "./commands/scan.js";
import { chatCommand } from "./commands/chat.js";
const program = new Command();
program
    .name("asst")
    .description(theme.brand("ASST Terminal") + " - ARES Solana Security Tool CLI")
    .version("1.1.0");
program
    .command("init")
    .description("Configure ASST environment (API Keys, RPC, etc.)")
    .action(async () => {
    intro(theme.brand(" ASST Terminal: Initialization "));
    // Logic for init can be added here
    outro(theme.success("Initialization complete!"));
});
program
    .command("scan")
    .description("Run a full security assurance scan (L1-L6)")
    .argument("[path]", "Path to project root", ".")
    .option("-m, --model <model>", "LLM model to use")
    .action(async (path, options) => {
    await scanCommand(path, options);
});
program
    .command("chat")
    .description("Start an interactive persistent chat session with the ASST agent")
    .action(async () => {
    await chatCommand();
});
program.parse();
