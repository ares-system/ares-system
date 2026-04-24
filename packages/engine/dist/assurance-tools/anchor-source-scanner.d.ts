import { z } from "zod";
/**
 * Runs the scan and returns BOTH a human-readable string (for the LLM)
 * AND a typed ToolResult artifact (for dashboards, CI, SARIF export).
 *
 * We leave the return as a single JSON string for now so existing agents
 * keep working unchanged; once SubAgent.invokeWithArtifacts() is wired,
 * we'll flip responseFormat to "content_and_artifact".
 */
export declare const anchorSourceScannerTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    projectPath: z.ZodString;
    programDir: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    projectPath: string;
    programDir?: string | undefined;
}, {
    projectPath: string;
    programDir?: string | undefined;
}, string, unknown, "anchor_source_scanner">;
