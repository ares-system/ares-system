import { tool } from "@langchain/core/tools";
import { z } from "zod";
function computeGini(sortedValues) {
    const n = sortedValues.length;
    if (n === 0)
        return 0;
    const mean = sortedValues.reduce((s, v) => s + v, 0) / n;
    if (mean === 0)
        return 0;
    let sumDiff = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            sumDiff += Math.abs(sortedValues[i] - sortedValues[j]);
        }
    }
    return sumDiff / (2 * n * n * mean);
}
function computeHHI(percentages) {
    // Herfindahl-Hirschman Index (0 = perfect competition, 10000 = monopoly)
    return Math.round(percentages.reduce((sum, p) => sum + p * p, 0));
}
function classifyRisk(top10, hhi, gini) {
    if (top10 > 90 || hhi > 5000) {
        return { level: "CRITICAL", reason: "Extreme concentration — single entity or small group controls >90% of supply" };
    }
    if (top10 > 70 || hhi > 2500) {
        return { level: "HIGH", reason: "High concentration — top holders control >70%, rug-pull risk elevated" };
    }
    if (top10 > 50 || gini > 0.8) {
        return { level: "MEDIUM", reason: "Moderate concentration — top 10 hold >50%, monitor for coordinated selling" };
    }
    return { level: "LOW", reason: "Distribution appears healthy — no single group dominates supply" };
}
// ─── Tool Definition ────────────────────────────────────────────────
const schema = z.object({
    mintAddress: z.string().describe("The SPL token mint address to analyze"),
    rpcUrl: z.string().optional().describe("Solana RPC endpoint (default: mainnet)"),
    limit: z.number().optional().describe("Max number of top holders to return (default: 20)")
});
export const tokenConcentrationTool = tool(async (input) => {
    const rpcUrl = input.rpcUrl || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const limit = input.limit || 20;
    try {
        // Step 1: Get token supply
        const supplyResponse = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTokenSupply",
                params: [input.mintAddress]
            })
        });
        const supplyData = await supplyResponse.json();
        if (supplyData.error) {
            return JSON.stringify({ status: "error", message: `RPC error: ${supplyData.error.message}` });
        }
        const totalSupply = parseFloat(supplyData.result?.value?.uiAmountString || "0");
        const decimals = supplyData.result?.value?.decimals || 0;
        if (totalSupply === 0) {
            return JSON.stringify({ status: "error", message: "Token has zero supply or is not a valid SPL token" });
        }
        // Step 2: Get largest token accounts
        const holdersResponse = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "getTokenLargestAccounts",
                params: [input.mintAddress]
            })
        });
        const holdersData = await holdersResponse.json();
        if (holdersData.error) {
            return JSON.stringify({ status: "error", message: `RPC error: ${holdersData.error.message}` });
        }
        const accounts = holdersData.result?.value || [];
        // Step 3: Map to holder info
        const holders = accounts
            .slice(0, limit)
            .map((acc) => {
            const balance = parseFloat(acc.uiAmountString || "0");
            const percentage = totalSupply > 0 ? (balance / totalSupply) * 100 : 0;
            return {
                address: acc.address,
                balance,
                percentage: Math.round(percentage * 100) / 100
            };
        })
            .filter((h) => h.balance > 0);
        // Step 4: Compute concentration metrics
        const percentages = holders.map((h) => h.percentage);
        const top10 = percentages.slice(0, 10).reduce((s, p) => s + p, 0);
        const top20 = percentages.slice(0, 20).reduce((s, p) => s + p, 0);
        const hhi = computeHHI(percentages);
        const gini = computeGini(holders.map((h) => h.balance).sort((a, b) => a - b));
        const { level, reason } = classifyRisk(top10, hhi, gini);
        const result = {
            status: "complete",
            mint: input.mintAddress,
            totalSupply,
            holders,
            metrics: {
                totalHolders: accounts.length,
                top10Concentration: Math.round(top10 * 100) / 100,
                top20Concentration: Math.round(top20 * 100) / 100,
                herfindahlIndex: hhi,
                giniCoefficient: Math.round(gini * 1000) / 1000,
                riskLevel: level,
                riskReason: reason
            }
        };
        return JSON.stringify(result, null, 2);
    }
    catch (error) {
        return JSON.stringify({
            status: "error",
            message: `Network error: ${error.message}`,
            hint: "Check RPC URL and network connectivity. Rate limiting is common on public RPC endpoints."
        });
    }
}, {
    name: "token_concentration_analyzer",
    description: "Analyzes SPL token holder concentration using Solana RPC. Returns the top holders, their percentages, and risk metrics including Herfindahl-Hirschman Index (HHI), Gini coefficient, and a concentration risk classification (LOW/MEDIUM/HIGH/CRITICAL). Useful for rug-pull risk assessment and tokenomics analysis.",
    schema
});
