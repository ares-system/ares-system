export declare class ASSTPersistence {
    private db;
    private runQuery;
    constructor(repoRoot: string);
    init(): Promise<void>;
    addHistory(role: string, content: string): Promise<void>;
    getHistory(limit?: number): Promise<unknown>;
    close(): Promise<unknown>;
}
