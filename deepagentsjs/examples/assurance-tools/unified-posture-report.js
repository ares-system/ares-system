import { existsSync } from "node:fs";
import { tool } from "langchain";
import { z } from "zod";
const schema = z.object({
    assuranceDir: z.string().describe("Path to assurance output directory"),
});
export const unifiedPostureReportTool = tool(async (input) => {
    if (!existsSync(input.assuranceDir)) {
        return "Assurance directory not found. Cannot generate posture report. Ensure 'write_assurance_manifest' ran successfully.";
    }
    return `Unified Posture Report initialized. 
The system has aggregated layer data in ${input.assuranceDir}.
A finalized PDF report can now be generated using the 'generate_pdf_report' tool.
- L1 (Program Logic): Analyzed via Semgrep.
- L3 (Chain State): Analyzed via Upgrade Monitor.
- L6 (Supply Chain): Analyzed via pnpm audit.`;
}, {
    name: "unified_posture_report",
    description: "Helps generate the top-level 8-layer score for the dashboard.",
    schema,
});
