import { z } from "zod";
/**
 * Read-only git summary for assurance lane §D.
 */
export declare const gitDiffSummaryTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    cwd: z.ZodOptional<z.ZodString>;
    stat: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, {
    cwd?: string | undefined;
    stat?: boolean | undefined;
}, {
    cwd?: string | undefined;
    stat?: boolean | undefined;
}, string, unknown, "git_diff_summary">;
