import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tool } from "langchain";
import { z } from "zod";
const schema = z.object({
    cwd: z.string().describe("Repository root to check"),
});
export const envHygieneCheckTool = tool(async (input) => {
    let report = "Environment Hygiene Check:\n";
    let isClean = true;
    // Check 1: Is .env.example present?
    if (!existsSync(join(input.cwd, ".env.example"))) {
        report += "❌ Missing .env.example file at root.\n";
        isClean = false;
    }
    else {
        report += "✅ Found .env.example.\n";
    }
    // Check 2: Does .gitignore contain .env?
    const gitignorePath = join(input.cwd, ".gitignore");
    if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, "utf-8");
        if (!gitignore.includes(".env")) {
            report += "❌ .gitignore does not explicitly ignore .env files.\n";
            isClean = false;
        }
        else {
            report += "✅ .gitignore properly ignores .env.\n";
        }
    }
    else {
        report += "❌ No .gitignore found.\n";
        isClean = false;
    }
    return report + (isClean ? "\nStatus: CLEAN" : "\nStatus: FAILED");
}, {
    name: "env_hygiene_check",
    description: "Validates repository environment configuration hygiene (e.g., .env ignores, example files).",
    schema,
});
