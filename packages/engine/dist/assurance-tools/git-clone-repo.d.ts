import { z } from "zod";
export declare const gitCloneRepoTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    url: z.ZodString;
    branch: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    url: string;
    branch?: string | undefined;
}, {
    url: string;
    branch?: string | undefined;
}, string, unknown, "git_clone_repo">;
