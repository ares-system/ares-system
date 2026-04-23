export declare class ASSTPersistence {
    private db;
    private repoRoot;
    constructor(repoRoot: string);
    init(): Promise<void>;
    upsertCodeIndex(path: string, hash: string): Promise<void>;
    searchCodeIndex(term: string): Promise<any>;
    addHistory(role: string, content: string): Promise<void>;
    getHistory(limit?: number): Promise<any[]>;
    close(): Promise<boolean>;
}
