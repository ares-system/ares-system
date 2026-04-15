import { z } from "zod";
/**
 * Generates a "Premium" style PDF security report.
 */
export declare const generatePdfReportTool: import("langchain").DynamicStructuredTool<z.ZodObject<{
    repoRoot: z.ZodString;
    findings: z.ZodArray<z.ZodObject<{
        severity: z.ZodString;
        title: z.ZodString;
        layer: z.ZodString;
        tool: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        remediation: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    summary: z.ZodOptional<z.ZodString>;
    outDir: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    repoRoot: string;
    findings: {
        severity: string;
        title: string;
        layer: string;
        tool: string;
        description?: string | undefined;
        remediation?: string | undefined;
    }[];
    summary?: string | undefined;
    outDir?: string | undefined;
}, {
    repoRoot: string;
    findings: {
        severity: string;
        title: string;
        layer: string;
        tool: string;
        description?: string | undefined;
        remediation?: string | undefined;
    }[];
    summary?: string | undefined;
    outDir?: string | undefined;
}, string, unknown, "generate_pdf_report">;
