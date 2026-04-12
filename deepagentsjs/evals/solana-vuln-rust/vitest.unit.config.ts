import { defineConfig } from "vitest/config";

/** Parser unit tests — no LangSmith / no LLM keys. */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["parse-dataset-text.test.ts", "eval-agreement.test.ts"],
    reporters: ["default"],
  },
});
