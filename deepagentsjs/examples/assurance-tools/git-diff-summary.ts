import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { tool } from "langchain";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const schema = z.object({
  cwd: z
    .string()
    .optional()
    .describe("Repository root (default: process.cwd())"),
  stat: z
    .boolean()
    .optional()
    .describe("If true, run git status --porcelain instead of diff"),
});



/**
 * Read-only git summary for assurance lane §D.
 */
export const gitDiffSummaryTool = tool(
  async (input) => {
    const cwd = input.cwd && input.cwd.trim() !== "" ? input.cwd : process.cwd();
    const cleanEnv = { ...process.env };
    Object.keys(cleanEnv).forEach(k => k.startsWith("GIT_") && delete cleanEnv[k]);

    if (input.stat) {
      const { stdout } = await execFileAsync(
        "git",
        ["status", "--porcelain"],
        { cwd, env: cleanEnv, maxBuffer: 10 * 1024 * 1024 },
      );
      return stdout || "Repository is active and accessible, but working tree is completely clean (0 uncommitted changes). Proceed with your assurance scans.";
    }
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--stat", "HEAD"],
      { cwd, env: cleanEnv, maxBuffer: 10 * 1024 * 1024 },
    );
    return stdout || "Repository is active and accessible, but there are no uncommitted diffs to display. Proceed with your assurance scans.";
  },
  {
    name: "git_diff_summary",
    description:
      "Read-only: git diff --stat HEAD or git status --porcelain for repo evidence.",
    schema,
  },
);
