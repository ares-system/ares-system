import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { config } from "dotenv";
import { join } from "path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

config({ path: join(process.cwd(), "../.env.local"), quiet: true } as any);

const my_tool = tool(
  async ({ input }) => `Result for ${input}`,
  {
    name: "my_tool",
    description: "Use this to test tool calls",
    schema: z.object({ input: z.string() }),
  }
);

async function test() {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
  }).bindTools([my_tool]);

  const res = await model.invoke([new HumanMessage("Use my_tool with input 'hello'")]);
  console.log("Type of content:", typeof res.content);
  console.log("Raw content:", JSON.stringify(res.content));
  console.log("Tool calls:", JSON.stringify(res.tool_calls));
}

test();
