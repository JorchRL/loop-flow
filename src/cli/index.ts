#!/usr/bin/env node
/**
 * Loop-Flow CLI Entry Point
 *
 * Commands:
 * - init: Initialize loop-flow for current repo
 * - status: Show current session status
 * - tasks: List and manage tasks
 * - export: Export to human-readable formats
 * - migrate: Migrate from file-based workflow
 * - mcp: Start MCP server
 */

import { Command } from "commander";
import { VERSION } from "../index.js";

const program = new Command();

program
  .name("loop-flow")
  .description("MCP server for AI-assisted development workflows")
  .version(VERSION);

// Init command
program
  .command("init")
  .description("Initialize loop-flow for the current repository")
  .option("-t, --template <template>", "Template to use", "generic")
  .option("--no-agents-md", "Skip creating AGENTS.md")
  .action(async (options) => {
    console.log("Initializing loop-flow...");
    console.log("Template:", options.template);
    console.log("Create AGENTS.md:", options.agentsMd);
    // TODO: Implement init logic
    console.log("\n[Not yet implemented - see LF-004]");
  });

// Status command
program
  .command("status")
  .description("Show current session status")
  .action(async () => {
    console.log("Loop-Flow Status");
    console.log("================");
    // TODO: Implement status logic
    console.log("\n[Not yet implemented - see LF-004]");
  });

// Tasks command
program
  .command("tasks")
  .description("List tasks")
  .option("-s, --status <status>", "Filter by status")
  .option("-p, --priority <priority>", "Filter by priority")
  .action(async (options) => {
    console.log("Tasks");
    console.log("=====");
    if (options.status) console.log("Status filter:", options.status);
    if (options.priority) console.log("Priority filter:", options.priority);
    // TODO: Implement tasks logic
    console.log("\n[Not yet implemented - see LF-007]");
  });

// Export command
program
  .command("export <type>")
  .description("Export backlog or progress")
  .option("-f, --format <format>", "Output format (json, markdown)", "markdown")
  .action(async (type, options) => {
    console.log(`Exporting ${type} as ${options.format}...`);
    // TODO: Implement export logic
    console.log("\n[Not yet implemented - see LF-010]");
  });

// Migrate command
program
  .command("migrate")
  .description("Migrate from file-based workflow")
  .requiredOption("-b, --backlog <path>", "Path to backlog.json")
  .requiredOption("-p, --progress <path>", "Path to progress.txt")
  .action(async (options) => {
    console.log("Migrating from file-based workflow...");
    console.log("Backlog:", options.backlog);
    console.log("Progress:", options.progress);
    // TODO: Implement migrate logic
    console.log("\n[Not yet implemented - see LF-009]");
  });

// MCP server command
program
  .command("mcp")
  .description("Start MCP server")
  .option("--stdio", "Use stdio transport (default)")
  .action(async (options) => {
    console.log("Starting MCP server...");
    console.log("Transport: stdio");
    // TODO: Implement MCP server start
    console.log("\n[Not yet implemented - see LF-005]");
  });

program.parse();
