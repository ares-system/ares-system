/**
 * Structured finding schema + helpers.
 *
 * See ./schema.ts for the types and ./helpers.ts for the constructors
 * and summarizers. Every assurance tool should emit findings through
 * `makeFinding()` and return a `ToolResult` via `makeToolResult()`.
 */
export * from "./schema.js";
export * from "./helpers.js";
export * from "./sarif.js";
