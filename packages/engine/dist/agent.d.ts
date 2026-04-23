export declare class ASSTAgentEngine {
    private agent;
    private persistence;
    currentModel: string;
    private repoRoot;
    constructor(repoRoot: string, modelId?: string);
    private initAgent;
    init(): Promise<void>;
    chat(input: string, fallbackIdx?: number): Promise<string>;
    private formatMessageContent;
    close(): Promise<void>;
}
