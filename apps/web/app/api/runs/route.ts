import { NextResponse } from "next/server";
import { getAssuranceData } from "@/lib/data";

export async function GET() {
  try {
    const { manifests } = getAssuranceData();

    const runs = manifests.map((m: any) => ({
      file: m.file,
      commit: m.git?.commit_sha?.substring(0, 7) || "unknown",
      branch: m.git?.branch || "unknown",
      timestamp: m.generated_at || null,
      semgrep: m.static_analysis?.semgrep?.status || "unknown",
      agentCount: m.agent_count || 0,
    }));

    return NextResponse.json({
      total: runs.length,
      runs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to list runs", message: error.message },
      { status: 500 }
    );
  }
}
