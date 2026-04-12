import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

/** Monorepo `deepagentsjs/.env` so OPENROUTER_* / LANGSMITH_* load when cwd is this package. */
const deepagentsRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
loadDotenv({ path: resolve(deepagentsRoot, ".env"), quiet: true });

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    testTimeout: 180_000,
    hookTimeout: 60_000,
    teardownTimeout: 60_000,
    include: ["index.test.ts"],
    setupFiles: ["@deepagents/evals/setup"],
    reporters: ["default", "langsmith/vitest/reporter"],
  },
});
