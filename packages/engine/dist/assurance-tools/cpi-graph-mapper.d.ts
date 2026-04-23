import { z } from "zod";
/**
 * Analyzes Anchor IDL to map out instructions and account requirements.
 */
export declare const cpiGraphMapperTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    idlPath: z.ZodString;
}, z.core.$strip>, {
    idlPath: string;
}, {
    idlPath: string;
}, string, unknown, "cpi_graph_mapper">;
