export interface SubAgentConfig {
    name: string;
    description: string;
    primaryModel: string;
    fallbackModels: string[];
    skills: string[];
    tools: any[];
    systemPromptPrefix: string;
}
export declare const SUB_AGENT_CONFIGS: SubAgentConfig[];
export declare class SubAgent {
    config: SubAgentConfig;
    private agent;
    private repoRoot;
    constructor(config: SubAgentConfig, repoRoot: string);
    private initAgent;
    invoke(input: string): Promise<string>;
    private formatContent;
}
/**
 * Create all sub-agents for a given repo.
 */
export declare function createAllSubAgents(repoRoot: string): Map<string, SubAgent>;
