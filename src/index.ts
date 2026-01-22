/**
 * Loop-Flow: MCP Server for AI-Assisted Development Workflows
 *
 * This is the main entry point for the library.
 * CLI entry point is at src/cli/index.ts
 * MCP server entry point is at src/mcp/server.ts
 */

import { createRequire } from "module";

// Read version from package.json (single source of truth)
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

export const VERSION: string = pkg.version;
