import { tool } from "langchain";
import { z } from "zod";
const schema = z.object({
    programId: z.string().min(1).describe("Solana program address to target"),
    slotInfo: z.string().optional().describe("Latest slot or commitment"),
});
/**
 * Monitor program upgrade authority and status
 */
export const programUpgradeMonitorTool = tool(async (input) => {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getAccountInfo",
            params: [input.programId, { encoding: "jsonParsed" }],
        }),
    });
    const data = await res.json();
    const value = data?.result?.value;
    if (!value) {
        return `Error: Program ${input.programId} not found on chain.`;
    }
    if (!value.executable) {
        return `Warning: ${input.programId} is NOT marked as executable. It may be a regular data account.`;
    }
    // Inspect BPF upgradable loader format
    const parsedData = value.data;
    if (parsedData && parsedData[0] === "parsed") {
        const info = parsedData[1]?.parsed?.info;
        if (info && info.programData) {
            return `Program: ${input.programId} 
Status: Upgradable (BPF Loader)
Program Data Account: ${info.programData}
To get the actual upgrade authority, analyze the Program Data Account using program_account_analyzer.`;
        }
    }
    return `Program: ${input.programId}\nStatus: Likely Immutable or using an unknown loader format.\nOwner: ${value.owner}`;
}, {
    name: "program_upgrade_monitor",
    description: "Checks if a Solana program is upgradable, getting its BPF loader info and Program Data Account.",
    schema,
});
