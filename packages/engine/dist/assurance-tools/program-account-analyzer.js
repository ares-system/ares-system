import { tool } from "@langchain/core/tools";
import { z } from "zod";
const schema = z.object({
    programId: z.string().min(1).describe("Solana program address"),
    rpcUrl: z.string().optional().describe("Optional custom RPC URL"),
});
/**
 * Analyze a Solana program account structure via RPC.
 */
export const programAccountAnalyzerTool = tool(async (input) => {
    const rpcUrl = input.rpcUrl ?? process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    // 1. Get Program Account Info
    const accountInfoRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getAccountInfo",
            params: [input.programId, { encoding: "jsonParsed" }],
        }),
    });
    const accountData = await accountInfoRes.json();
    // 2. Get Program Accounts Count (only getting size for speed)
    const programAccountsRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "getProgramAccounts",
            params: [input.programId, { dataSlice: { offset: 0, length: 0 } }],
        }),
    });
    const programAccountsData = await programAccountsRes.json();
    const accountCount = programAccountsData?.result?.length || 0;
    let parsedProgramData = "Unknown";
    let isExecutable = false;
    if (accountData?.result?.value) {
        isExecutable = accountData.result.value.executable;
        const parsed = accountData.result.value.data?.[0] === "parsed" ? accountData.result.value.data[1] : accountData.result.value.data;
        parsedProgramData = JSON.stringify(parsed, null, 2);
    }
    return `Program: ${input.programId}
Executable: ${isExecutable}
Total Sub-Accounts: ${accountCount}
Account Data/Upgrade Authority: 
${parsedProgramData}`;
}, {
    name: "program_account_analyzer",
    description: "Analyzes a Solana program address, retrieving execution status, upgrade authority (if available in parsed data), and total accounts owned.",
    schema,
});
