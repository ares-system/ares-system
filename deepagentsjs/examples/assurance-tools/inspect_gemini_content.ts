import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), "../.env.local"), quiet: true } as any);

async function test() {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const res = await model.invoke([new HumanMessage("Hello, tell me a 1 word joke.")]);
  console.log("Type of content:", typeof res.content);
  console.log("Raw content:", JSON.stringify(res.content));
}

test();
