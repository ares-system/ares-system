import { intro, outro, text, spinner } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { Orchestrator } from "../engine/orchestrator.js";
export async function chatCommand(options) {
    const repoRoot = process.cwd();
    const orchestrator = new Orchestrator(repoRoot);
    await orchestrator.init();
    intro(theme.accent(" ASST MULTI-AGENT SHELL "));
    console.log(theme.info("Architecture: ") + "Orchestrator → 6 sub-agents");
    console.log(theme.info("Orchestrator: ") + "gemini-2.5-flash (reasoning)");
    console.log(theme.info("Context: ") + theme.repo(repoRoot));
    console.log(theme.info("Type 'exit' to quit.\n"));
    while (true) {
        const userInput = await text({
            message: theme.brand("User >"),
            placeholder: "e.g., Analyze the access control in src/lib.rs",
            validate: (value) => {
                if (value.length === 0)
                    return "Please enter a message.";
            }
        });
        if (!userInput || userInput === "exit" || userInput === "quit" || typeof userInput === "symbol") {
            break;
        }
        const s = spinner();
        try {
            const response = await orchestrator.chat(userInput, (status) => {
                s.start(status);
            });
            s.stop("Response generated.");
            console.log(`\n${theme.accent("ASST >")} ${response}\n`);
        }
        catch (e) {
            s.stop(theme.error("Error thinking. Check logs or model availability."));
            console.error(e.message);
        }
    }
    await orchestrator.close();
    outro(theme.brand(" Sessions saved. Goodbye! "));
}
