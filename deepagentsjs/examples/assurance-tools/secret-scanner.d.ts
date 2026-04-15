import { z } from "zod";
export declare const secretScannerTool: import("langchain").DynamicStructuredTool<z.ZodObject<{
    cwd: z.ZodString;
}, z.core.$strip>, {
    cwd: string;
}, {
    cwd: string;
}, string, unknown, "secret_scanner">;
