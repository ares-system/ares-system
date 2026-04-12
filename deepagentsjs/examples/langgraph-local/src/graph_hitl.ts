/**
 * Human-in-the-loop sketch: `interrupt()` pauses until `Command(resume=...)`.
 * Requires a checkpointer (MemorySaver for dev).
 *
 * @see https://docs.langchain.com/oss/javascript/langgraph/interrupts
 */
import {
  Command,
  END,
  MemorySaver,
  START,
  StateGraph,
  StateSchema,
  interrupt,
} from "@langchain/langgraph";
import { z } from "zod";

const State = new StateSchema({
  topic: z.string().default(""),
  approved: z.boolean().default(false),
});

const ask = async (state: typeof State.State) => {
  const answer = interrupt({
    kind: "approval",
    topic: state.topic,
    message: "Approve continuing?",
  }) as { ok: boolean };

  return { approved: Boolean(answer?.ok) };
};

const done = async (state: typeof State.State) => ({
  topic: state.approved
    ? `${state.topic} (approved)`
    : `${state.topic} (rejected)`,
});

export const graphHitl = new StateGraph(State)
  .addNode("ask", ask)
  .addNode("done", done)
  .addEdge(START, "ask")
  .addConditionalEdges("ask", (s) => (s.approved ? "done" : END), ["done", END])
  .addEdge("done", END)
  .compile({
    checkpointer: new MemorySaver(),
  });

graphHitl.name = "asst-hitl-approval";

/** Resume after interrupt — use same thread_id as the paused run. */
export function resumeCommand(ok: boolean): Command {
  return new Command({ resume: { ok } });
}
