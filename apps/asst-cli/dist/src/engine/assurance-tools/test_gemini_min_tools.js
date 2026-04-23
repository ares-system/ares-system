import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { config } from "dotenv";
import { join } from "path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
config({ path: join(process.cwd(), "../.env.local"), quiet: true });
const git_clone_repo = tool(async ({ url }) => `Cloned ${url}`, {
    name: "git_clone_repo",
    description: "Clones a remote Git repository down to a local directory for analysis.",
    schema: z.object({ url: z.string() }),
});
async function test() {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,
    }).bindTools([git_clone_repo]);
    const res = await model.invoke([new HumanMessage("Please clone this repository: https://github.com/nullxnothing/daemon.git")]);
    console.log("Tool calls:", JSON.stringify(res.tool_calls));
}
test();
