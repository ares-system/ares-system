import { NextResponse } from "next/server";
import { createPublicOrchestrator } from "@/lib/engine-factory";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target, model } = body ?? {};

    const ares = createPublicOrchestrator({ model });

    // Scan runs in the background to avoid HTTP timeouts. In production this
    // should be behind a job queue (BullMQ / etc.).
    ares.runFullScan((agent, status) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[scan] ${agent}: ${status}`);
      }
    }).catch((err) => {
      console.error("[ARES Scan Error]:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Security scan initiated successfully.",
      target: target ?? ".",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("API Scan Route Error:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate ARES scan",
        details: error.message || "Unknown execution error",
      },
      { status: 500 },
    );
  }
}
