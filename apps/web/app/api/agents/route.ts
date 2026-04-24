import { NextResponse } from "next/server";
import { SUB_AGENT_CONFIGS } from "@ares/engine";

export async function GET() {
  try {
    // Map SUB_AGENT_CONFIGS to the UI expectations
    const agents = SUB_AGENT_CONFIGS.map((config, index) => ({
      id: `a-${index + 1}`,
      name: config.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      type: config.name.includes('scanner') || config.name.includes('detector') || config.name.includes('analyst') 
        ? 'behavioral_scanner' 
        : 'protocol_auditor',
      status: 'idle', // In a real system, we'd check a job queue/process manager
      lastRun: 'Recently',
      successRate: 98 + Math.random(),
      currentTask: config.description,
      model: config.primaryModel
    }));

    return NextResponse.json(agents);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to load agents", message: error.message },
      { status: 500 }
    );
  }
}
