/**
 * Merge multiple SARIF 2.1.0 logs into a single log with one run (concatenated results).
 * Used by the P2 static-analysis lane (e.g. Semgrep → SARIF).
 */
export type SarifRule = {
    id?: string;
    [key: string]: unknown;
};
export type SarifResult = Record<string, unknown>;
export type SarifDriver = {
    name?: string;
    version?: string;
    rules?: SarifRule[];
    [key: string]: unknown;
};
export type SarifRun = {
    tool?: {
        driver?: SarifDriver;
    };
    results?: SarifResult[];
    [key: string]: unknown;
};
export type SarifLog = {
    version?: string;
    $schema?: string;
    runs?: SarifRun[];
    [key: string]: unknown;
};
/**
 * Merge SARIF logs. Empty input yields a minimal valid-shaped log with no results.
 */
export declare function mergeSarifLogs(logs: SarifLog[]): SarifLog;
export declare function parseSarifJson(raw: unknown): SarifLog;
