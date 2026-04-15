import { intro, outro, text, spinner } from "@clack/prompts";
import { theme } from "../ui/theme.js";
import { ASSTAgentEngine } from "../engine/agent.js";

export async function chatCommand() {
  const repoRoot = process.cwd();
  const agent = new ASSTAgentEngine(repoRoot);
  await agent.init();

  intro(theme.accent(" ASST INTERACTIVE SHELL "));
  console.log(theme.info("Type 'exit' to quit. Context: ") + theme.repo(repoRoot));

  while (true) {
    const userInput = await text({
      message: theme.brand("User >"),
      placeholder: "e.g., Analyze the access control in src/lib.rs",
      validate: (value) => {
        if (value.length === 0) return "Please enter a message.";
      }
    });

    if (!userInput || userInput === "exit" || userInput === "quit" || typeof userInput === "symbol") {
      break;
    }

    const s = spinner();
    s.start("ASST is thinking...");
    
    try {
      const response = await agent.chat(userInput);
      s.stop("Response generated.");
      console.log(`\n${theme.accent("ASST >")} ${response}\n`);
    } catch (e: any) {
      s.stop(theme.error("Error thinking. Check logs or model availability."));
      console.error(e.message);
    }
  }

  await agent.close();
  outro(theme.brand(" Sessions saved. Goodbye! "));
}
