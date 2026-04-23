import { z } from "zod";
/**
 * Snapshots an account's state data at the current slot.
 */
export declare const accountStateSnapshotTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    programId: z.ZodString;
    rpcUrl: z.ZodOptional<z.ZodString>;
    outDir: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    programId: string;
    rpcUrl?: string | undefined;
    outDir?: string | undefined;
}, {
    programId: string;
    rpcUrl?: string | undefined;
    outDir?: string | undefined;
}, string, unknown, "account_state_snapshot">;
