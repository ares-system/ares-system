import { z } from "zod";
/**
 * Read-only Solana JSON-RPC call. RPC URL from `SOLANA_RPC_URL` or devnet default.
 */
export declare const solanaRpcReadTool: import("langchain").DynamicStructuredTool<z.ZodObject<{
    method: z.ZodString;
    params: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
}, z.core.$strip>, {
    method: string;
    params?: unknown[] | undefined;
}, {
    method: string;
    params?: unknown[] | undefined;
}, string, unknown, "solana_rpc_read">;
