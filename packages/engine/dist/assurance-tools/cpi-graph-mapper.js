import { readFileSync, existsSync } from "node:fs";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
const schema = z.object({
    idlPath: z.string().describe("Path to Anchor IDL JSON file"),
});
/**
 * Analyzes Anchor IDL to map out instructions and account requirements.
 */
export const cpiGraphMapperTool = tool(async (input) => {
    if (!existsSync(input.idlPath)) {
        return `Error: IDL file not found at ${input.idlPath}`;
    }
    try {
        const idlStr = readFileSync(input.idlPath, "utf-8");
        const idl = JSON.parse(idlStr);
        let report = `IDL Analysis for Program: ${idl.name || "Unknown"}\n`;
        report += `Version: ${idl.version || "Unknown"}\n\n`;
        if (!idl.instructions || idl.instructions.length === 0) {
            return report + "No instructions found in IDL.";
        }
        report += `Instructions (\`${idl.instructions.length}\` found):\n`;
        idl.instructions.forEach((ix) => {
            report += `\n- **${ix.name}**\n`;
            const accounts = ix.accounts || [];
            if (accounts.length > 0) {
                report += `  Accounts:\n`;
                let hasSigner = false;
                accounts.forEach((acc) => {
                    const annotations = [];
                    if (acc.isMut)
                        annotations.push("mut");
                    if (acc.isSigner) {
                        annotations.push("signer");
                        hasSigner = true;
                    }
                    report += `    - ${acc.name} [${annotations.join(", ")}]\n`;
                });
                if (!hasSigner) {
                    report += `  ⚠️ WARNING: Instruction has no signers. Potential unauthenticated access risk.\n`;
                }
            }
            else {
                report += `  Accounts: None\n`;
            }
        });
        return report;
    }
    catch (e) {
        return `Error parsing IDL JSON: ${e}`;
    }
}, {
    name: "cpi_graph_mapper",
    description: "Analyzes an Anchor IDL JSON file to extract program instructions, account structures, and identify potential risks like missing signers.",
    schema,
});
