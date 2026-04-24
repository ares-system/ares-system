import { NextResponse } from "next/server";
import { createPublicOrchestrator } from "@/lib/engine-factory";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, repo, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const ares = createPublicOrchestrator({
      repoRoot: repo || process.cwd(),
      model,
    });
    const result = await ares.chat(prompt);

    return NextResponse.json({ response: result });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      {
        error: "Failed to communicate with ARES engine",
        details: error.message || "Unknown execution error",
      },
      { status: 500 },
    );
  }
}
