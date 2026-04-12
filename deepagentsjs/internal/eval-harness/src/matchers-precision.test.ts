import { AIMessage } from "@langchain/core/messages";
import * as ls from "langsmith/vitest";
import { expect } from "vitest";

import type { AgentTrajectory } from "./matchers.js";

/**
 * Golden-style checks: matcher precision on synthetic trajectories (no LLM).
 * Uses `ls.test` so LangSmith `logFeedback` in matchers receives context.
 */
ls.describe("matchers-precision", () => {
  ls.test("toHaveAgentSteps matches exact step count", {}, () => {
    const trajectory: AgentTrajectory = {
      steps: [
        {
          index: 1,
          action: new AIMessage("a"),
          observations: [],
        },
        {
          index: 2,
          action: new AIMessage("b"),
          observations: [],
        },
      ],
      files: {},
    };
    expect(trajectory).toHaveAgentSteps(2);
  });

  ls.test("toHaveToolCallRequests counts tool_calls", {}, () => {
    const trajectory: AgentTrajectory = {
      steps: [
        {
          index: 1,
          action: new AIMessage({
            content: "",
            tool_calls: [
              { id: "1", name: "x", args: {} },
              { id: "2", name: "y", args: {} },
            ],
          }),
          observations: [],
        },
      ],
      files: {},
    };
    expect(trajectory).toHaveToolCallRequests(2);
  });
});
