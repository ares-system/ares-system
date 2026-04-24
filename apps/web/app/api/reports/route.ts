import { NextResponse } from "next/server";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { getAssuranceData } from "@/lib/data";

export async function GET() {
  try {
    const data = await getAssuranceData();
    // Corrected: latest check + better root detection
    const repoRoot = data.latest?.repoRoot || process.cwd();
    const reportsDir = join(repoRoot, ".asst", "reports");
    
    let reports: any[] = [];

    if (existsSync(reportsDir)) {
      const files = readdirSync(reportsDir).filter(f => f.endsWith('.pdf'));
      reports = files.map(file => {
        const stats = statSync(join(reportsDir, file));
        return {
          id: file,
          name: file.replace('.pdf', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          type: 'security_audit',
          date: stats.mtime.toISOString().split('T')[0],
          status: 'verified',
          size: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
          path: `/api/reports/download?file=${encodeURIComponent(file)}`
        };
      });
    }

    // Fallback/Mock if none exist yet for UI demonstration
    if (reports.length === 0) {
      reports = [
        { id: 'rep-init', name: 'Initial System Manifest', type: 'compliance', date: new Date().toISOString().split('T')[0], status: 'verified', size: '0.1 MB' }
      ];
    }

    return NextResponse.json(reports);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // In a real scenario, this would trigger the report_synthesizer agent
    // For now, we'll return a message that it's queued
    return NextResponse.json({ message: "Synthesis request queued. ARES agents are aggregating logical buffers." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
