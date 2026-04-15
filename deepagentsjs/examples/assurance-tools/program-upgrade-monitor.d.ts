import { z } from "zod";
/**
 * Monitor program upgrade authority and status
 */
export declare const programUpgradeMonitorTool: import("langchain").DynamicStructuredTool<z.ZodObject<{
    programId: z.ZodString;
    slotInfo: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, {
    programId: string;
    slotInfo?: string | undefined;
}, {
    programId: string;
    slotInfo?: string | undefined;
}, string, unknown, "program_upgrade_monitor">;
