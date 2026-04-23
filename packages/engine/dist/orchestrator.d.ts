export declare class Orchestrator {
    private llm;
    private subAgents;
    private persistence;
    private repoRoot;
    constructor(repoRoot: string);
    init(): Promise<void>;
    /**
     * Process a user message through the orchestrator → sub-agents pipeline.
     */
    chat(input: string, onStatus?: (msg: string) => void): Promise<string>;
    /**
     * Ask the orchestrator LLM to decide which sub-agents to invoke.
     */
    private route;
    /**
     * Deterministic scan — runs ALL sub-agents in order (no LLM routing needed).
     */
    runFullScan(onStatus?: (agent: string, status: string) => void): Promise<{
        agent: string;
        output: string;
    }[]>;
    private formatContent;
    close(): Promise<void>;
}
