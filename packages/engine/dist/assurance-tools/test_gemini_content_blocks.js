import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), "../.env.local"), quiet: true });
async function test() {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,
    });
    const sysMsg = new SystemMessage({
        contentBlocks: [
            { type: "text", text: "You are a helpful assistant." },
            { type: "text", text: "Always start your answer with 'YES SIR!'" },
        ],
    });
    const res = await model.invoke([sysMsg, new HumanMessage("Hello")]);
    console.log("Raw response:", JSON.stringify(res.content));
}
test();
