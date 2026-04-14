import { NextResponse } from "next";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { prompt, toolModel } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Run the agent CLI in the deepagentsjs directory
    const cwd = join(process.cwd(), "../../deepagentsjs");
    
    // Clean up ALL Next.js injected Git environment variables so git resolves correctly from cwd
    const cleanEnv: Record<string, string | undefined> = { ...process.env };
    Object.keys(cleanEnv).forEach(key => {
      if (key.startsWith("GIT_")) {
        delete cleanEnv[key];
      }
    });

    // Use exec so Windows resolves pnpm through the shell environment variables
    const { stdout, stderr } = await execAsync(
      `pnpm exec tsx examples/assurance-tools/agent-cli.ts "${prompt.replace(/"/g, '\\"')}" "${toolModel || "meta-llama/llama-3.3-70b-instruct:free"}"`, 
      { 
        cwd, 
        maxBuffer: 20 * 1024 * 1024,
        env: cleanEnv 
      }
    );

    if (stderr && !stdout) {
      console.error("Agent Error:", stderr);
      return new Response(JSON.stringify({ error: "Agent encountered an error", details: stderr }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ response: stdout.trim() }), { status: 200, headers: { "Content-Type": "application/json" } });
    
  } catch (error: any) {
    console.error("API Route Error:", error);
    
    const errorDetails = error.stderr || error.stdout || error.message || "Unknown execution error";
    
    return new Response(JSON.stringify({ 
      error: "Failed to communicate with agent",
      details: String(errorDetails).substring(0, 1000)
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
