import { z } from "zod";
export declare const secretScannerTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    cwd: z.ZodString;
}, z.core.$strip>, {
    cwd: string;
}, {
    cwd: string;
}, string, unknown, "secret_scanner">;
