import { execFileSync } from "node:child_process";
import { tool } from "langchain";
import { z } from "zod";
import { join } from "node:path";
import { mkdirSync, existsSync, rmSync } from "node:fs";
const schema = z.object({
    url: z.string().describe("The HTTPS Git URL to clone (e.g., https://github.com/nullxnothing/daemon.git)"),
    branch: z.string().optional().describe("Specific branch to clone (optional)"),
});
export const gitCloneRepoTool = tool(async (input) => {
    try {
        // Create targets directory securely in the working directory
        const targetsDir = join(process.cwd(), "assurance", "targets");
        if (!existsSync(targetsDir)) {
            mkdirSync(targetsDir, { recursive: true });
        }
        // Extract repo name safely from URL
        const repoMatch = input.url.match(/([^\/]+)\.git$/) || input.url.match(/([^\/]+)$/);
        const repoName = repoMatch ? repoMatch[1].replace(/[^a-zA-Z0-9_-]/g, "") : `repo_${Date.now()}`;
        const cloneDir = join(targetsDir, repoName);
        // Wipe existing cache if it exists so we get a fresh read
        if (existsSync(cloneDir)) {
            rmSync(cloneDir, { recursive: true, force: true });
        }
        // Execute clone natively
        const args = ["clone", "--depth", "1"]; // Shallow clone for rapid evaluation
        if (input.branch) {
            args.push("--branch", input.branch);
        }
        args.push(input.url, cloneDir);
        execFileSync("git", args, {
            cwd: process.cwd(),
            encoding: "utf8",
            maxBuffer: 20 * 1024 * 1024
        });
        return `Successfully cloned repository into isolated workspace. 
CRITICAL IMPORTANT INSTRUCTION: You MUST pass the following string explicitly into the \`cwd\` parameter of EVERY subsequent tool you use: 
${cloneDir}`;
    }
    catch (e) {
        return `Error attempting to clone repository: ${e}`;
    }
}, {
    name: "git_clone_repo",
    description: "Clones a remote Git repository via URL so it can be passed to other analysis tools. The returned path MUST be used as the `cwd` argument for all subsequent tools.",
    schema,
});
