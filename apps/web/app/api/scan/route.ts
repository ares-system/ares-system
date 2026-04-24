import { NextResponse } from "next/server";
import { Orchestrator } from "@ares/engine";
import { join } from "node:path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target } = body;

    // Default to the repo root above apps/web
    const repoRoot = process.cwd();
    
    // Instantiate the engine
    const ares = new Orchestrator(repoRoot);
    
    // Trigger the scan in the background
    // We don't await the full scan here to avoid timeout, 
    // instead we let it run and update persistence.
    // Note: In a real production app, we would use a proper job queue.
    ares.runFullScan(target || ".").catch(err => {
      console.error("[ARES Scan Error]:", err);
    });

    return NextResponse.json({ 
      success: true, 
      message: "Security scan initiated successfully.",
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("API Scan Route Error:", error);
    
    return NextResponse.json({ 
      error: "Failed to initiate ARES scan",
      details: error.message || "Unknown execution error"
    }, { status: 500 });
  }
}
