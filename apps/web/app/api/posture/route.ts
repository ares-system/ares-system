import { NextResponse } from "next/server";
import { getAssuranceData } from "@/lib/data";

export async function GET() {
  try {
    const { posture, latest, manifests } = getAssuranceData();

    return NextResponse.json({
      overall: posture.overall,
      grade: posture.grade,
      layers: posture.layers,
      latestRun: latest
        ? {
            commit: latest?.git?.commit_sha?.substring(0, 7) || "unknown",
            timestamp: latest?.generated_at || null,
            semgrep: latest?.static_analysis?.semgrep?.status || "unknown",
          }
        : null,
      totalRuns: manifests.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to compute posture", message: error.message },
      { status: 500 }
    );
  }
}
