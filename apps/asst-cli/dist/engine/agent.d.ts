export declare class ASSTAgentEngine {
    private agent;
    private persistence;
    constructor(repoRoot: string, modelId?: string);
    init(): Promise<void>;
    chat(input: string): Promise<any>;
    close(): Promise<void>;
}
