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
    const cwd = input.cwd ?? process.cwd();
    if (input.stat) {
      const { stdout } = await execFileAsync(
        "git",
        ["status", "--porcelain"],
        { cwd, maxBuffer: 10 * 1024 * 1024 },
      );
      return stdout || "(clean)";
    }
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--stat", "HEAD"],
      { cwd, maxBuffer: 10 * 1024 * 1024 },
    );
    return stdout || "(no diff)";
  },
  {
    name: "git_diff_summary",
    description:
      "Read-only: git diff --stat HEAD or git status --porcelain for repo evidence.",
    schema,
  },
);
