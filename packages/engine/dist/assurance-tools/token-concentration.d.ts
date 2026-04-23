import { z } from "zod";
export declare const tokenConcentrationTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    mintAddress: z.ZodString;
    rpcUrl: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, {
    mintAddress: string;
    rpcUrl?: string | undefined;
    limit?: number | undefined;
}, {
    mintAddress: string;
    rpcUrl?: string | undefined;
    limit?: number | undefined;
}, string, unknown, "token_concentration_analyzer">;
