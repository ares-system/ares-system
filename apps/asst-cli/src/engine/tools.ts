import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { confirm } from "@clack/prompts";
import { theme } from "../ui/theme.js";

const execAsync = promisify(exec);

/**
 * Tool to read a file's content
 */
export const readFileTool = tool(
  async ({ path }) => {
    try {
      const content = await fs.readFile(path, "utf-8");
      return content;
    } catch (e: any) {
      return `Error reading file ${path}: ${e.message}`;
    }
  },
  {
    name: "read_file",
    description: "Read the contents of a file in the repository.",
    schema: z.object({ path: z.string().describe("Path to the file") }),
  }
);

/**
 * Tool to write or edit a file (Requires user confirmation in Safe Mode)
 */
export const writeFileTool = tool(
  async ({ path, content, explanation }) => {
    const shouldProceed = await confirm({
      message: `${theme.warning("Awaiting Approval")}: Agent wants to write to ${theme.repo(path)}.\nReason: ${explanation}\nProceed?`,
    });

    if (!shouldProceed || typeof shouldProceed !== "boolean") {
      return "Action cancelled by user.";
    }

    try {
      await fs.writeFile(path, content, "utf-8");
      return `Succesfully wrote to ${path}`;
    } catch (e: any) {
      return `Error writing to ${path}: ${e.message}`;
    }
  },
  {
    name: "write_file",
    description: "Write or edit the contents of a file. Requires user approval.",
    schema: z.object({
      path: z.string().describe("Path to write to"),
      content: z.string().describe("New content for the file"),
      explanation: z.string().describe("Why is this change necessary?"),
    }),
  }
);

/**
 * Tool to run terminal commands (Requires user confirmation)
 */
export const runTerminalCmdTool = tool(
  async ({ command, explanation }) => {
    const shouldProceed = await confirm({
      message: `${theme.warning("Awaiting Approval")}: Agent wants to run command: ${theme.brand(command)}\nReason: ${explanation}\nProceed?`,
    });

    if (!shouldProceed || typeof shouldProceed !== "boolean") {
      return "Action cancelled by user.";
    }

    try {
      const { stdout, stderr } = await execAsync(command);
      return `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
    } catch (e: any) {
      return `Command failed: ${e.message}\n${e.stderr || ""}`;
    }
  },
  {
    name: "run_terminal_cmd",
    description: "Execute a shell command. Requires user approval.",
    schema: z.object({
      command: z.string().describe("The shell command to run"),
      explanation: z.string().describe("Why is this command necessary?"),
    }),
  }
);
