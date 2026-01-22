/**
 * LoopFlow Setup Wizard
 * 
 * Writes local MCP config files for AI tools.
 * All configs are project-local (travel with the repo).
 */

import * as p from "@clack/prompts";
import * as fs from "fs";
import * as path from "path";
import { VERSION } from "../index.js";

// =============================================================================
// Types
// =============================================================================

interface ToolConfig {
  id: string;
  name: string;
  localPath: string;  // Relative to repo root
  description: string;
}

interface WizardResult {
  success: boolean;
  configured: string[];
  skipped: string[];
  errors: Array<{ tool: string; error: string }>;
}

// =============================================================================
// Tool Definitions (all local configs)
// =============================================================================

function getToolConfigs(): ToolConfig[] {
  return [
    {
      id: "claude-code",
      name: "Claude Code",
      localPath: ".mcp.json",
      description: "Anthropic's official CLI for Claude",
    },
    {
      id: "opencode",
      name: "OpenCode",
      localPath: "opencode.json",
      description: "Open-source AI coding assistant",
    },
    {
      id: "cursor",
      name: "Cursor",
      localPath: ".cursor/mcp.json",
      description: "AI-first code editor",
    },
  ];
}

// =============================================================================
// MCP Configuration Writers
// =============================================================================

function writeClaudeCodeConfig(filePath: string): { success: boolean; error?: string } {
  try {
    let config: Record<string, unknown> = {};
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      config = JSON.parse(content);
    }
    
    const mcpServers = (config.mcpServers as Record<string, unknown>) || {};
    mcpServers.loopflow = {
      type: "stdio",
      command: "npx",
      args: ["-y", "loopflow@latest", "mcp"],
    };
    config.mcpServers = mcpServers;
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function writeOpenCodeConfig(filePath: string): { success: boolean; error?: string } {
  try {
    let config: Record<string, unknown> = {
      "$schema": "https://opencode.ai/config.json",
    };
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      config = JSON.parse(content);
    }
    
    const mcp = (config.mcp as Record<string, unknown>) || {};
    mcp.loopflow = {
      type: "stdio",
      command: ["npx", "-y", "loopflow@latest", "mcp"],
      enabled: true,
    };
    config.mcp = mcp;
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function writeCursorConfig(filePath: string): { success: boolean; error?: string } {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let config: Record<string, unknown> = {};
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      config = JSON.parse(content);
    }
    
    const mcpServers = (config.mcpServers as Record<string, unknown>) || {};
    mcpServers.loopflow = {
      command: "npx",
      args: ["-y", "loopflow@latest", "mcp"],
    };
    config.mcpServers = mcpServers;
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function writeTool(tool: ToolConfig, repoPath: string): { success: boolean; error?: string } {
  const filePath = path.join(repoPath, tool.localPath);
  
  switch (tool.id) {
    case "claude-code":
      return writeClaudeCodeConfig(filePath);
    case "opencode":
      return writeOpenCodeConfig(filePath);
    case "cursor":
      return writeCursorConfig(filePath);
    default:
      return { success: false, error: `Unknown tool: ${tool.id}` };
  }
}

// =============================================================================
// Wizard Flow
// =============================================================================

export async function runSetupWizard(options: {
  repoPath?: string;
  skipToolConfig?: boolean;
}): Promise<WizardResult> {
  const repoPath = options.repoPath || process.cwd();
  const result: WizardResult = {
    success: true,
    configured: [],
    skipped: [],
    errors: [],
  };

  p.intro(`LoopFlow Setup v${VERSION}`);

  if (options.skipToolConfig) {
    p.log.info("Skipping MCP config (--no-mcp flag)");
    p.outro("Done. Configure MCP manually if needed.");
    return result;
  }

  const tools = getToolConfigs();

  // Check which configs already exist
  const existing = tools.filter(t => fs.existsSync(path.join(repoPath, t.localPath)));
  
  if (existing.length > 0) {
    p.note(
      existing.map(t => t.localPath).join("\n"),
      "Existing configs (will be updated)"
    );
  }

  // Multi-select tools
  const toolOptions = tools.map(t => ({
    value: t.id,
    label: t.name,
    hint: t.localPath,
  }));

  const selectedTools = await p.multiselect({
    message: "Which AI tools will you use? (creates local config files)",
    options: toolOptions,
    initialValues: tools.map(t => t.id),  // Select all by default
    required: false,
  });

  if (p.isCancel(selectedTools)) {
    p.cancel("Cancelled.");
    result.success = false;
    return result;
  }

  if (selectedTools.length === 0) {
    p.log.warn("No tools selected.");
    result.skipped = tools.map(t => t.name);
    p.outro("Done. Add MCP config manually when needed.");
    return result;
  }

  // Write configs
  const s = p.spinner();
  
  for (const toolId of selectedTools) {
    const tool = tools.find(t => t.id === toolId)!;
    s.start(`Writing ${tool.localPath}...`);
    
    const writeResult = writeTool(tool, repoPath);
    
    if (writeResult.success) {
      s.stop(`Created ${tool.localPath}`);
      result.configured.push(tool.localPath);
    } else {
      s.stop(`Failed: ${tool.localPath}`);
      result.errors.push({ tool: tool.name, error: writeResult.error || "Unknown error" });
      result.success = false;
    }
  }

  // Summary
  if (result.configured.length > 0) {
    p.note(
      result.configured.join("\n"),
      "Created/updated"
    );
  }

  if (result.errors.length > 0) {
    p.note(
      result.errors.map(e => `${e.tool}: ${e.error}`).join("\n"),
      "Errors"
    );
  }

  p.outro("Done! Restart your AI tool to load LoopFlow.");

  return result;
}

// =============================================================================
// Standalone Wizard (for loopflow setup command)
// =============================================================================

export async function runStandaloneWizard(): Promise<void> {
  const result = await runSetupWizard({});
  process.exit(result.success ? 0 : 1);
}
