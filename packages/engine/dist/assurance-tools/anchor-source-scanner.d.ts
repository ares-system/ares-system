import { z } from "zod";
export declare const anchorSourceScannerTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    projectPath: z.ZodString;
    programDir: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    projectPath: string;
    programDir?: string | undefined;
}, {
    projectPath: string;
    programDir?: string | undefined;
}, string, unknown, "anchor_source_scanner">;
