import { z } from "zod";
declare global {
    var ARES_ASK_PERMISSION: ((message: string) => Promise<boolean>) | undefined;
}
/**
 * Tool to read a file's content
 */
export declare const readFileTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>, {
    path: string;
}, {
    path: string;
}, string, unknown, "read_file">;
/**
 * Tool to write or edit a file (Requires user confirmation in Safe Mode)
 */
export declare const writeFileTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
    explanation: z.ZodString;
}, z.core.$strip>, {
    path: string;
    content: string;
    explanation: string;
}, {
    path: string;
    content: string;
    explanation: string;
}, string, unknown, "write_file">;
/**
 * Tool to run terminal commands (Requires user confirmation)
 */
export declare const runTerminalCmdTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    command: z.ZodString;
    explanation: z.ZodString;
}, z.core.$strip>, {
    command: string;
    explanation: string;
}, {
    command: string;
    explanation: string;
}, string, unknown, "run_terminal_cmd">;
