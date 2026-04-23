import { z } from "zod";
export declare const envHygieneCheckTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    cwd: z.ZodString;
}, z.core.$strip>, {
    cwd: string;
}, {
    cwd: string;
}, string, unknown, "env_hygiene_check">;
