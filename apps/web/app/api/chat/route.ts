import { NextResponse } from "next/server";
import { Orchestrator } from "@ares/engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, repo } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Server-Side Safety Hook: Auto-approve tools since there is no terminal UI
    globalThis.ARES_ASK_PERMISSION = async (msg: string) => {
      console.warn("[ARES Server Hook] Auto-approving tool execution:", msg);
      return true;
    };

    // Default to the repo root above apps/web
    const repoRoot = repo || process.cwd();
    
    // Instantiate the engine directly
    const ares = new Orchestrator(repoRoot);
    const result = await ares.chat(prompt);

    return NextResponse.json({ response: result });
    
  } catch (error: any) {
    console.error("API Route Error:", error);
    
    return NextResponse.json({ 
      error: "Failed to communicate with ARES engine",
      details: error.message || "Unknown execution error"
    }, { status: 500 });
  }
}
