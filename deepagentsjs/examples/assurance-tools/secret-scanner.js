import { execFileSync } from "node:child_process";
import { tool } from "langchain";
import { z } from "zod";
const schema = z.object({
    cwd: z.string().describe("Repository root to scan"),
});
export const secretScannerTool = tool(async (input) => {
    try {
        const cwd = input.cwd && input.cwd.trim() !== "" ? input.cwd : process.cwd();
        const cleanEnv = { ...process.env };
        Object.keys(cleanEnv).forEach(k => k.startsWith("GIT_") && delete cleanEnv[k]);
        const output = execFileSync("git", ["log", "--diff-filter=A", "-p"], {
            cwd,
            env: cleanEnv,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024
        });
        const secrets = [];
        const lines = output.split('\n');
        const patterns = [
            { name: "AWS Key", regex: /AKIA[0-9A-Z]{16}/ },
            { name: "OpenRouter Key", regex: /sk-or-/ },
            { name: "Helius Key", regex: /helius.*api-key/i },
            { name: "Private RSA Key", regex: /-----BEGIN PRIVATE KEY-----/ },
        ];
        lines.forEach((line, i) => {
            if (!line.startsWith('+'))
                return; // only care about additions
            patterns.forEach(p => {
                if (p.regex.test(line)) {
                    secrets.push(`Found potential ${p.name} on addition line (context line roughly ${i})`);
                }
            });
        });
        if (secrets.length === 0) {
            return "Secret scan complete: No hardcoded secrets found in git additions.";
        }
        return `Secret scan complete. WARNING: FOUND EXPOSURES:\n` + secrets.join("\n");
    }
    catch (e) {
        return `Error running secret scan: ${e}`;
    }
}, {
    name: "secret_scanner",
    description: "Scans the git repository history for committed hardcoded secrets like API keys and private keys.",
    schema,
});
