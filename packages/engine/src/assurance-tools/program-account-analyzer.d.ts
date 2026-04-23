import { z } from "zod";
/**
 * Analyze a Solana program account structure via RPC.
 */
export declare const programAccountAnalyzerTool: import("langchain").DynamicStructuredTool<z.ZodObject<{
    programId: z.ZodString;
    rpcUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    programId: string;
    rpcUrl?: string | undefined;
}, {
    programId: string;
    rpcUrl?: string | undefined;
}, string, unknown, "program_account_analyzer">;
