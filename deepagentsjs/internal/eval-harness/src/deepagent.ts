import { v4 as uuidv4 } from "uuid";
import {
  registerRunner,
  parseTrajectory,
  type EvalRunner,
  type RunAgentParams,
  type AgentTrajectory,
} from "./index.js";
import { type CreateDeepAgentParams, type DeepAgent } from "deepagents";

/**
 * {@link EvalRunner} implementation backed by `createDeepAgent`.
 *
 * The factory is **not** called in the constructor — that avoids eager model
 * construction (and env validation) when runner modules are imported. Each
 * {@link run} builds a new agent via `factory(overrides)`. Use {@link extend}
 * to create a runner with additional configuration (system prompt, tools,
 * subagents, etc.).
 */
export class DeepAgentEvalRunner implements EvalRunner {
  name: string;

  constructor(
    name: string,
    private factory: (config?: Partial<CreateDeepAgentParams>) => DeepAgent,
    private overrides?: Record<string, unknown>,
  ) {
    this.name = name;
  }

  extend(overrides: Record<string, unknown>): EvalRunner {
    return new DeepAgentEvalRunner(this.name, this.factory, overrides);
  }

  async run(params: RunAgentParams): Promise<AgentTrajectory> {
    const agent = this.factory(this.overrides);

    const inputs: Record<string, unknown> = {
      messages: [{ role: "user", content: params.query }],
    };

    if (params.initialFiles != null) {
      const files: Record<string, unknown> = {};
      for (const [filePath, content] of Object.entries(params.initialFiles)) {
        const now = new Date().toISOString();
        files[filePath] = {
          content: content.split("\n"),
          created_at: now,
          modified_at: now,
        };
      }
      inputs.files = files;
    }

    const threadId = uuidv4();
    const config = { configurable: { thread_id: threadId } };

    const result = await agent.invoke(inputs, config);

    if (typeof result !== "object" || result == null) {
      throw new TypeError(
        `Expected invoke result to be object, got ${typeof result}`,
      );
    }

    const r = result as Record<string, unknown>;
    return parseTrajectory(
      r.messages as unknown[],
      r.files as Record<string, unknown>,
    );
  }
}

/**
 * Register a deepagents-backed {@link EvalRunner}.
 *
 * The `factory` receives optional overrides (via {@link EvalRunner.extend})
 * and should return a compiled agent. Typically:
 *
 * ```ts
 * registerDeepAgentRunner("sonnet-4-5", (config) =>
 *   createDeepAgent({ ...config, model: new ChatAnthropic({ model: "claude-sonnet-4-5-20250929" }) }),
 * );
 * ```
 *
 * @param name    - Runner name (matched against the `EVAL_RUNNER` env var).
 * @param factory - Creates an invokable agent, optionally accepting overrides.
 */
export function registerDeepAgentRunner(
  name: string,
  factory: (config?: Record<string, unknown>) => DeepAgent,
): void {
  registerRunner(new DeepAgentEvalRunner(name, factory));
}
