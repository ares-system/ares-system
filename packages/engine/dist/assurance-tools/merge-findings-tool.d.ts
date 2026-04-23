import { z } from "zod";
/**
 * Merge SARIF 2.1.0 files using the same logic as the P2 assurance lane.
 */
export declare const mergeFindingsTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    inputPaths: z.ZodArray<z.ZodString>;
    outputPath: z.ZodString;
}, z.core.$strip>, {
    inputPaths: string[];
    outputPath: string;
}, {
    inputPaths: string[];
    outputPath: string;
}, string, unknown, "merge_findings">;
