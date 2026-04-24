/**
 * Read-only agent tools. Safe to mount on public surfaces (web API, MCP).
 *
 * These tools never write to the filesystem and never spawn subprocesses
 * beyond calling well-known binaries with fixed arguments (git, etc.).
 * For that class of tools (git diff, semgrep, etc.) see assurance-tools/.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "node:fs/promises";

/**
 * Read a file from the filesystem. Always safe.
 */
export const readFileTool = tool(
  async ({ path }: { path: string }) => {
    try {
      return await fs.readFile(path, "utf-8");
    } catch (e: any) {
      return `Error reading file ${path}: ${e.message}`;
    }
  },
  {
    name: "read_file",
    description: "Read the contents of a file in the repository.",
    schema: z.object({ path: z.string().describe("Path to the file") }),
  },
);
