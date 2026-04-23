import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
const schema = z.object({
    programId: z.string().describe("Solana program address or account"),
    rpcUrl: z.string().optional().describe("Optional custom RPC URL"),
    outDir: z.string().optional().describe("Output directory. Defaults to 'assurance/snapshots'"),
});
/**
 * Snapshots an account's state data at the current slot.
 */
export const accountStateSnapshotTool = tool(async (input) => {
    const rpcUrl = input.rpcUrl ?? process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    const dir = input.outDir ?? join(process.cwd(), "..", "assurance", "snapshots");
    try {
        const res = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getAccountInfo",
                params: [input.programId, { encoding: "base64" }],
            }),
        });
        const data = await res.json();
        const context = data?.result?.context;
        const value = data?.result?.value;
        if (!value) {
            return `Error: Account ${input.programId} not found on chain.`;
        }
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const snapshotSlot = context?.slot || "unknown";
        const filename = `snapshot-${input.programId}-${snapshotSlot}.json`;
        const filepath = join(dir, filename);
        const snapshotData = {
            generated_at: new Date().toISOString(),
            slot: snapshotSlot,
            account: input.programId,
            owner: value.owner,
            lamports: value.lamports,
            executable: value.executable,
            data_base64: value.data[0],
        };
        writeFileSync(filepath, JSON.stringify(snapshotData, null, 2), "utf8");
        return `Successfully snapshotted account ${input.programId} at slot ${snapshotSlot}.\nSaved to: ${filepath}`;
    }
    catch (e) {
        return `Error snapshotting account state: ${e}`;
    }
}, {
    name: "account_state_snapshot",
    description: "Takes a snapshot of raw account state data (base64) from Solana and saves it to the evidence directory for reproducability.",
    schema,
});
