/**
 * Minimal chat graph for local Agent Server (`langgraphjs dev`).
 * Uses in-memory checkpointing — fine for dev; use PostgresSaver in production.
 *
 * @see https://docs.langchain.com/oss/javascript/langgraph/local-server
 * @see https://docs.langchain.com/oss/javascript/langgraph/persistence
 */
import { AIMessage } from "@langchain/core/messages";
import {
  END,
  MemorySaver,
  MessagesValue,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const echo = async (state: typeof State.State) => {
  const last = state.messages.at(-1);
  const text =
    typeof last?.content === "string"
      ? last.content
      : JSON.stringify(last?.content ?? "");
  return {
    messages: [
      new AIMessage(
        `Local dev echo (thread persists with checkpointer): ${text}`,
      ),
    ],
  };
};

export const graph = new StateGraph(State)
  .addNode("echo", echo)
  .addEdge(START, "echo")
  .addEdge("echo", END)
  .compile({
    checkpointer: new MemorySaver(),
  });

graph.name = "asst-echo-agent";
