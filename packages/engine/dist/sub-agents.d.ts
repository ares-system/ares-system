import { createMutatingTools } from "./tools/mutating.js";
import { type ToolResult } from "./findings/index.js";
export interface SubAgentConfig {
    name: string;
    description: string;
    /** Provider-prefixed model id (e.g. "google:gemini-2.5-flash"). */
    primaryModel: string;
    fallbackModels: string[];
    /** Skills always baked into the system prompt (vetted per sub-agent). */
    skills: string[];
    tools: any[];
    systemPromptPrefix: string;
    /**
     * Per-agent retrieval knob. When > 0, each invoke() call TF-IDF-ranks
     * the whole skill catalog against the incoming task and prepends the
     * top-K matches (minus already-pinned skills) to the user message.
     *
     * Defaults to the value of $ASST_SKILL_RETRIEVAL_TOPK (0 = off).
     */
    retrievalTopK?: number;
}
export declare const SUB_AGENT_CONFIGS: SubAgentConfig[];
export declare class SubAgent {
    config: SubAgentConfig;
    private agent;
    private repoRoot;
    /** Lazy, shared across invokes. Rebuilt automatically when SKILL.md files change. */
    private _catalog;
    private _catalogLoaded;
    constructor(config: SubAgentConfig, repoRoot: string);
    private getCatalog;
    private resolveRetrievalTopK;
    /**
     * Build the retrieval-augmented user input for a given task. Pinned skills
     * are already in the system prompt, so we exclude them from retrieval.
     * Returns `input` unchanged if retrieval is disabled or no skills match.
     */
    private augmentWithRetrievedSkills;
    private initAgent;
    invoke(input: string): Promise<string>;
    /**
     * Invoke the sub-agent and also collect any `ToolResult` envelopes that
     * its tools returned. This is the preferred entry point for hosts that
     * want structured findings (dashboards, CI gates, SARIF export).
     *
     * Tools whose output isn't a valid ToolResult are silently skipped —
     * `artifacts` only contains envelopes that successfully parsed.
     */
    invokeWithArtifacts(input: string): Promise<{
        output: string;
        artifacts: ToolResult[];
    }>;
    private formatContent;
}
/**
 * Build all sub-agents for a given repo.
 *
 * Mutating tools (write_file, run_terminal_cmd) are NOT attached by default.
 * Surfaces that want them should extend the config list or call
 * `createMutatingTools()` and merge the returned tools into each sub-agent.
 */
export declare function createAllSubAgents(repoRoot: string): Map<string, SubAgent>;
export { createMutatingTools };
