import { HumanMessage } from "@langchain/core/messages";
import {
  MemorySaver,
  StateGraph,
  StateSchema,
  START,
  END,
} from "@langchain/langgraph";
import { expect, test } from "vitest";
import * as z from "zod";

import { graph } from "./graph.js";

test("echo graph runs with thread-scoped memory (MemorySaver)", async () => {
  const r1 = await graph.invoke(
    { messages: [new HumanMessage("first")] },
    { configurable: { thread_id: "t1" } },
  );
  expect(String(r1.messages.at(-1)?.content ?? "")).toContain("first");

  const r2 = await graph.invoke(
    { messages: [new HumanMessage("second")] },
    { configurable: { thread_id: "t1" } },
  );
  expect(r2.messages.length).toBeGreaterThan(2);
});

test("pattern from docs: fresh checkpointer per test", async () => {
  const State = new StateSchema({ my_key: z.string() });
  const createGraph = () =>
    new StateGraph(State)
      .addNode("node1", () => ({ my_key: "hello from node1" }))
      .addNode("node2", () => ({ my_key: "hello from node2" }))
      .addEdge(START, "node1")
      .addEdge("node1", "node2")
      .addEdge("node2", END);

  const compiled = createGraph().compile({ checkpointer: new MemorySaver() });
  const result = await compiled.invoke(
    { my_key: "initial_value" },
    { configurable: { thread_id: "1" } },
  );
  expect(result.my_key).toBe("hello from node2");
});
