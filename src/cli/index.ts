#!/usr/bin/env node
/**
 * Loop-Flow CLI Entry Point
 *
 * Commands:
 * - init: Initialize loop-flow for current repo (with setup wizard)
 * - setup: Run setup wizard to configure AI tools
 * - ui: Start web UI dashboard
 * - mcp: Start MCP server
 * - share-feedback: Review and share queued feedback as GitHub issues
 * 
 * Note: Task management, export, and migration are handled via MCP tools
 * (loop_task_list, loop_export, loop_import) for use within AI sessions.
 */

import { Command } from "commander";
import * as path from "path";
import { VERSION } from "../index.js";
import { initLoopFlow, formatInitResult } from "./init.js";
import { runSetupWizard } from "./wizard.js";
import { shareFeedback } from "./share-feedback.js";

const program = new Command();

program
  .name("loopflow")
  .description("MCP server for AI-assisted development workflows")
  .version(VERSION);

// Init command
program
  .command("init")
  .description("Initialize LoopFlow for the current repository")
  .option("-p, --path <path>", "Target directory (defaults to current)")
  .option("--no-agents-md", "Skip creating/updating AGENTS.md")
  .option("--no-mcp", "Skip MCP tool configuration wizard")
  .option("-f, --force", "Reinitialize even if already set up")
  .action(async (options) => {
    // First, initialize the repo
    const result = await initLoopFlow({
      path: options.path,
      noAgentsMd: !options.agentsMd,
      force: options.force,
      noMcp: !options.mcp,
    });
    
    if (!result.success) {
      console.log(formatInitResult(result));
      process.exit(1);
    }
    
    // Show what was created
    console.log(formatInitResult(result));
    console.log("");
    
    // Run wizard unless --no-mcp
    if (options.mcp !== false) {
      const wizardResult = await runSetupWizard({
        repoPath: options.path || process.cwd(),
      });
      process.exit(wizardResult.success ? 0 : 1);
    } else {
      console.log("Skipping MCP configuration. Run 'loopflow setup' later to configure AI tools.");
      process.exit(0);
    }
  });

// Setup command (standalone wizard)
program
  .command("setup")
  .description("Configure AI tools (Claude Code, OpenCode, Cursor) to use LoopFlow")
  .option("--dev", "Dev mode: configure MCP to use local build instead of npx")
  .action(async (options) => {
    const result = await runSetupWizard({ devMode: options.dev });
    process.exit(result.success ? 0 : 1);
  });

// MCP server command
program
  .command("mcp")
  .description("Start MCP server")
  .option("--stdio", "Use stdio transport (default)")
  .action(async () => {
    // Import and run the MCP server
    await import("../mcp/server.js");
  });

// Share feedback command
program
  .command("share-feedback")
  .description("Review and share queued feedback as GitHub issues, or export to file")
  .option("--path <path>", "Repository path (defaults to current directory)")
  .option("--dry-run", "Preview what would be shared without creating issues")
  .option("--export <file>", "Export to markdown file instead of creating GitHub issues")
  .action(async (options) => {
    const repoPath = options.path ? path.resolve(options.path) : process.cwd();
    
    // Check if .loop-flow exists
    const loopFlowDir = path.join(repoPath, ".loop-flow");
    const fs = await import("fs");
    if (!fs.existsSync(loopFlowDir)) {
      console.error("Error: No .loop-flow directory found.");
      console.error("Run 'loopflow init' first to initialize LoopFlow.");
      process.exit(1);
    }
    
    const result = await shareFeedback({
      repoPath,
      dryRun: options.dryRun,
      export: options.export,
    });
    
    process.exit(result.success ? 0 : 1);
  });

// UI command
program
  .command("ui")
  .description("Start web UI dashboard")
  .option("-p, --port <port>", "Port to run on", "3000")
  .option("--no-open", "Don't auto-open browser")
  .option("--path <path>", "Repository path (defaults to current directory)")
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const repoPath = options.path ? path.resolve(options.path) : process.cwd();
    
    // Check if .loop-flow exists
    const loopFlowDir = path.join(repoPath, ".loop-flow");
    const fs = await import("fs");
    if (!fs.existsSync(loopFlowDir)) {
      console.error("Error: No .loop-flow directory found.");
      console.error("Run 'loopflow init' first to initialize LoopFlow.");
      process.exit(1);
    }
    
    // Determine static directory (built UI files)
    // In development, UI is served by Vite dev server
    // In production, UI is built and served from dist/ui
    const staticDir = path.join(import.meta.dirname, "..", "ui");
    const hasBuiltUI = fs.existsSync(path.join(staticDir, "index.html"));
    
    console.log("Starting LoopFlow UI...");
    console.log(`Repository: ${repoPath}`);
    console.log(`Port: ${port}`);
    
    if (!hasBuiltUI) {
      console.log("\nNote: No built UI found. Run the following to build:");
      console.log("  cd src/ui && npm install && npm run build");
      console.log("\nStarting API server only (use Vite dev server for UI)...\n");
    }
    
    // Start the server
    const { startServer } = await import("../api/server.js");
    await startServer({
      port,
      repoPath,
      staticDir: hasBuiltUI ? staticDir : undefined,
    });
    
    // Auto-open browser
    if (options.open) {
      const open = (await import("open")).default;
      const url = `http://localhost:${port}`;
      console.log(`\nOpening ${url} in browser...`);
      await open(url);
    }
  });

program.parse();
