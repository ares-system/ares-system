/**
 * @deprecated Import from `@ares/engine` directly.
 *
 * This directory used to contain the canonical implementation of the
 * assurance tools. Ownership has moved to `packages/engine/src/assurance-tools`
 * so that the CLI, Next.js web surface, and MCP server all share one source
 * of truth. These files remain as thin re-exports for backward compatibility
 * with external consumers that imported from `deepagentsjs/examples/...`.
 *
 * New code should use:
 *
 *     import { secretScannerTool } from "@ares/engine";
 */
export * from "@ares/engine";
