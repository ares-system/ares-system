import { ASSTPersistence } from "./persistence.js";
export declare class ASSTCodeSearch {
    private repoRoot;
    private persistence;
    constructor(repoRoot: string, persistence: ASSTPersistence);
    indexAll(spinner: any): Promise<void>;
    /**
     * Search for code patterns (Semantic-ish Mock)
     */
    search(query: string): Promise<string>;
}
