import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.fuzz.test.ts"],
    exclude: ["**/*.int.test.ts"],
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        branches: 65,
        functions: 80,
        statements: 80,
      },
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.fuzz.test.ts",
        "**/supply-chain-merged.ts",
        "**/manifest-schema.ts",
      ],
    },
  },
});
