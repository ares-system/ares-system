import { z } from "zod";
/**
 * Spawns the assurance manifest CLI (real implementation, not a mock).
 */
export declare const writeAssuranceManifestTool: import("langchain").DynamicStructuredTool<z.ZodObject<{
    repoRoot: z.ZodString;
    deepagentsjsRoot: z.ZodOptional<z.ZodString>;
    outDir: z.ZodOptional<z.ZodString>;
    noSupplyChain: z.ZodOptional<z.ZodBoolean>;
    noStaticAnalysis: z.ZodOptional<z.ZodBoolean>;
    semgrepScanRoot: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    repoRoot: string;
    deepagentsjsRoot?: string | undefined;
    outDir?: string | undefined;
    noSupplyChain?: boolean | undefined;
    noStaticAnalysis?: boolean | undefined;
    semgrepScanRoot?: string | undefined;
    notes?: string | undefined;
}, {
    repoRoot: string;
    deepagentsjsRoot?: string | undefined;
    outDir?: string | undefined;
    noSupplyChain?: boolean | undefined;
    noStaticAnalysis?: boolean | undefined;
    semgrepScanRoot?: string | undefined;
    notes?: string | undefined;
}, string, unknown, "write_assurance_manifest">;
