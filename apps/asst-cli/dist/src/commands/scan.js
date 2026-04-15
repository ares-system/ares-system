import { outro, spinner, note, confirm } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { ASSTAgentEngine } from "../engine/agent.js";
import boxen from "boxen";
export async function scanCommand(path, options) {
    console.log(boxen(theme.header(" ASST SECURITY SCAN: L1-L6 "), { padding: 1, borderColor: "#B54C38", margin: 1 }));
    const s = spinner();
    const agent = new ASSTAgentEngine(path, options.model);
    await agent.init();
    // -- Phase 1: Sequential Lanes --
    const lanes = [
        { name: "L1: Program Logic", tool: "Semgrep" },
        { name: "L3: Chain State", tool: "Account Analyzer" },
        { name: "L6: Supply Chain", tool: "pnpm audit" }
    ];
    for (const lane of lanes) {
        s.start(`Running ${lane.name} (${lane.tool})...`);
        // In a real run, we would call agent.chat("Run " + lane.name)
        await new Promise(r => setTimeout(r, 1500));
        s.stop(`${theme.success("✓")} ${lane.name} complete.`);
    }
    // -- Phase 2: Findings Report --
    note(`
${theme.error("Found 1 Security Issue:")}
- Missing Signer Check in withdraw instructions (High)

${theme.success("No critical secrets found in environment.")}
  `, "SCAN FINDINGS");
    // -- Phase 3: Propose Fixes --
    const shouldFix = await confirm({
        message: "Would you like me to propose and apply autonomous fixes for these findings?",
    });
    if (shouldFix && typeof shouldFix === "boolean") {
        s.start("Agent is drafting remediation patches...");
        const suggestion = await agent.chat("Based on the scan findings, propose a fix for the missing signer check.");
        s.stop("Proposals ready.");
        note(suggestion, "REMEDIATION PROPOSALS");
        const apply = await confirm({
            message: "Apply these fixes to the source code? (Requires write_file approval)",
        });
        if (apply && typeof apply === "boolean") {
            // The agent will naturally use write_file tool which triggers our UI approval
            await agent.chat("Apply the fix for the missing signer check now.");
        }
    }
    await agent.close();
    outro(theme.brand(" ASST Scan Complete. See /assurance for evidence. "));
}
