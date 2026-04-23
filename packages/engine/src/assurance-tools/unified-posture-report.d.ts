import { z } from "zod";
export declare const unifiedPostureReportTool: import("langchain").DynamicStructuredTool<z.ZodObject<{
    assuranceDir: z.ZodString;
}, z.core.$strip>, {
    assuranceDir: string;
}, {
    assuranceDir: string;
}, string, unknown, "unified_posture_report">;
