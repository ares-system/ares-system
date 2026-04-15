import { tool } from "langchain";
import { z } from "zod";
const schema = z.object({
    method: z.string().min(1).describe("JSON-RPC method name"),
    params: z
        .array(z.unknown())
        .optional()
        .describe("JSON-RPC params array"),
});
/**
 * Read-only Solana JSON-RPC call. RPC URL from `SOLANA_RPC_URL` or devnet default.
 */
export const solanaRpcReadTool = tool(async (input) => {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    const body = {
        jsonrpc: "2.0",
        id: 1,
        method: input.method,
        params: input.params ?? [],
    };
    const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    return `status=${res.status}\n${text}`;
}, {
    name: "solana_rpc_read",
    description: "POST a JSON-RPC request to Solana RPC (read-only). Set SOLANA_RPC_URL for custom endpoint.",
    schema,
});
