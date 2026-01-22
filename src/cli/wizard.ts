/**
 * LoopFlow Setup Wizard
 * 
 * Interactive TUI for configuring LoopFlow with AI tools.
 * Supports: Claude Code, OpenCode, Cursor
 */

import * as p from "@clack/prompts";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { VERSION } from "../index.js";

// =============================================================================
// Types
// =============================================================================

interface ToolConfig {
  id: string;
  name: string;
  configPath: string;
  detected: boolean;
  description: string;
}

interface WizardResult {
  success: boolean;
  configured: string[];
  skipped: string[];
  errors: Array<{ tool: string; error: string }>;
}

// =============================================================================
// Tool Detection & Configuration
// =============================================================================

function getToolConfigs(): ToolConfig[] {
  const home = os.homedir();
  
  return [
    {
      id: "claude-code",
      name: "Claude Code",
      configPath: path.join(home, ".claude.json"),
      detected: fs.existsSync(path.join(home, ".claude.json")),
      description: "Anthropic's official CLI for Claude",
    },
    {
      id: "opencode",
      name: "OpenCode",
      configPath: "opencode.json", // Project-local
      detected: commandExists("opencode"),
      description: "Open-source AI coding assistant",
    },
    {
      id: "cursor",
      name: "Cursor",
      configPath: path.join(home, ".cursor", "mcp.json"),
      detected: fs.existsSync(path.join(home, ".cursor")),
      description: "AI-first code editor",
    },
  ];
}

function commandExists(cmd: string): boolean {
  try {
    const { execSync } = require("child_process");
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// MCP Configuration Writers
// =============================================================================

function configureClaudeCode(configPath: string): { success: boolean; error?: string } {
  try {
    let config: Record<string, unknown> = {};
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(content);
    }
    
    // Add or update mcpServers
    const mcpServers = (config.mcpServers as Record<string, unknown>) || {};
    mcpServers.loopflow = {
      type: "stdio",
      command: "npx",
      args: ["-y", "loopflow@latest", "mcp"],
      env: {},
    };
    config.mcpServers = mcpServers;
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function configureOpenCode(configPath: string): { success: boolean; error?: string } {
  try {
    let config: Record<string, unknown> = {
      "$schema": "https://opencode.ai/config.json",
    };
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(content);
    }
    
    // Add or update mcp section
    const mcp = (config.mcp as Record<string, unknown>) || {};
    mcp.loopflow = {
      type: "stdio",
      command: ["npx", "-y", "loopflow@latest", "mcp"],
      enabled: true,
    };
    config.mcp = mcp;
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function configureCursor(configPath: string): { success: boolean; error?: string } {
  try {
    // Ensure .cursor directory exists
    const cursorDir = path.dirname(configPath);
    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }
    
    let config: Record<string, unknown> = {};
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(content);
    }
    
    // Add or update mcpServers
    const mcpServers = (config.mcpServers as Record<string, unknown>) || {};
    mcpServers.loopflow = {
      command: "npx",
      args: ["-y", "loopflow@latest", "mcp"],
    };
    config.mcpServers = mcpServers;
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function configureTool(tool: ToolConfig): { success: boolean; error?: string } {
  switch (tool.id) {
    case "claude-code":
      return configureClaudeCode(tool.configPath);
    case "opencode":
      return configureOpenCode(tool.configPath);
    case "cursor":
      return configureCursor(tool.configPath);
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
  const result: WizardResult = {
    success: true,
    configured: [],
    skipped: [],
    errors: [],
  };

  p.intro(`LoopFlow Setup v${VERSION}`);

  // Get available tools
  const tools = getToolConfigs();
  const detectedTools = tools.filter((t) => t.detected);

  // Show detection status
  if (detectedTools.length > 0) {
    p.note(
      detectedTools.map((t) => `${t.name}`).join("\n"),
      "Detected AI tools"
    );
  }

  if (options.skipToolConfig) {
    p.log.info("Skipping tool configuration (--no-mcp flag)");
    result.skipped = tools.map((t) => t.name);
    p.outro("Setup complete! Configure MCP servers manually if needed.");
    return result;
  }

  // Multi-select tools to configure
  const toolOptions = tools.map((t) => ({
    value: t.id,
    label: t.name,
    hint: t.detected ? "detected" : "not detected",
  }));

  const selectedTools = await p.multiselect({
    message: "Select AI tools to configure with LoopFlow:",
    options: toolOptions,
    initialValues: detectedTools.map((t) => t.id),
    required: false,
  });

  if (p.isCancel(selectedTools)) {
    p.cancel("Setup cancelled.");
    result.success = false;
    return result;
  }

  // Configure selected tools
  if (selectedTools.length === 0) {
    p.log.warn("No tools selected. You can configure MCP servers manually later.");
    result.skipped = tools.map((t) => t.name);
  } else {
    const s = p.spinner();
    
    for (const toolId of selectedTools) {
      const tool = tools.find((t) => t.id === toolId)!;
      s.start(`Configuring ${tool.name}...`);
      
      const configResult = configureTool(tool);
      
      if (configResult.success) {
        s.stop(`${tool.name} configured`);
        result.configured.push(tool.name);
      } else {
        s.stop(`${tool.name} failed`);
        result.errors.push({ tool: tool.name, error: configResult.error || "Unknown error" });
        result.success = false;
      }
    }
    
    // Mark unselected as skipped
    for (const tool of tools) {
      if (!selectedTools.includes(tool.id)) {
        result.skipped.push(tool.name);
      }
    }
  }

  // Summary
  if (result.configured.length > 0) {
    p.note(
      result.configured.map((t) => `✓ ${t}`).join("\n"),
      "Configured"
    );
  }

  if (result.errors.length > 0) {
    p.note(
      result.errors.map((e) => `✗ ${e.tool}: ${e.error}`).join("\n"),
      "Errors"
    );
  }

  // Next steps
  const nextSteps = [
    "Restart your AI tool to load the MCP server",
    "The agent will call loop_orient at session start",
    "Run 'loopflow ui' to open the web dashboard",
  ];

  p.note(nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"), "Next steps");

  p.outro("Setup complete!");

  return result;
}

// =============================================================================
// Standalone Wizard (for loopflow setup command)
// =============================================================================

export async function runStandaloneWizard(): Promise<void> {
  const result = await runSetupWizard({});
  process.exit(result.success ? 0 : 1);
}
