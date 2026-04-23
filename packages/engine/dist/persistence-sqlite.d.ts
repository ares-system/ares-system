interface ChatMessage {
    role: string;
    content: string;
    timestamp: string;
}
interface IndexRecord {
    path: string;
    content_hash: string;
    last_indexed: string;
}
export declare class ASSTPersistenceSQLite {
    private db;
    private repoRoot;
    constructor(repoRoot: string);
    init(): Promise<void>;
    private migrateFromLowdb;
    addHistory(role: string, content: string): Promise<void>;
    getHistory(limit?: number): Promise<ChatMessage[]>;
    upsertCodeIndex(path: string, hash: string): Promise<void>;
    searchCodeIndex(term: string): Promise<IndexRecord[]>;
    addScanResult(agent: string, output: string, repo: string): Promise<void>;
    getLatestScanResults(repo: string, limit?: number): Promise<unknown[]>;
    addWatchEvent(eventType: string, filePath: string, alerts: number): Promise<void>;
    getWatchStats(since?: string): Promise<unknown>;
    close(): Promise<boolean>;
}
export {};
