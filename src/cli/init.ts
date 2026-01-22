/**
 * LoopFlow Init Command
 * 
 * Initializes LoopFlow for a repository:
 * 1. Creates .loop-flow/ directory
 * 2. Creates SQLite database with schema
 * 3. Creates WORKFLOW.md with methodology rules
 * 4. Optionally adds hook to AGENTS.md
 */

import * as fs from "fs";
import * as path from "path";
import { openDatabase } from "../db/schema.js";
import { VERSION } from "../index.js";

export interface InitOptions {
  /** Target directory (defaults to cwd) */
  path?: string;
  /** Skip creating/updating AGENTS.md */
  noAgentsMd?: boolean;
  /** Force reinitialize even if .loop-flow exists */
  force?: boolean;
}

export interface InitResult {
  success: boolean;
  path: string;
  created: string[];
  skipped: string[];
  error?: string;
}

/**
 * Default WORKFLOW.md content for new repos
 */
const DEFAULT_WORKFLOW = `# LoopFlow Workflow Rules

**LoopFlow Version:** ${VERSION}

This file defines how AI agents should work in this repository using LoopFlow.

---

## Quick Start

At the start of every session, the agent calls \`loop_orient\` to get:
- Recent session history and suggested actions
- Active tasks and priorities  
- Captured insights and learnings
- Workflow rules (this file)

---

## Core Principles

1. **Developer has the reins**: You make final decisions. AI helps, doesn't replace.

2. **One task, one session**: Complete focused work. No partial progress across sessions.

3. **Capture insights**: Use \`loop_remember\` to save insights, gotchas, and discoveries.

4. **Ask when uncertain**: Clarify before implementing. Better questions → better outcomes.

5. **No commit without permission**: AI agents never commit or push without explicit approval.

---

## Session Workflow

\`\`\`
Session Start (loop_orient)
    |
    v
Pick a task (loop_task_update -> IN_PROGRESS)
    |
    v
Work (capture insights with loop_remember)
    |
    v
Complete task (loop_task_update -> DONE)
    |
    v
Session End (loop_handoff)
\`\`\`

---

## MCP Tools Reference

| Tool | Purpose |
|------|---------|
| \`loop_orient\` | Start session, get full context |
| \`loop_remember\` | Capture an insight quickly |
| \`loop_scan\` | Search insights and tasks |
| \`loop_expand\` | Get full details for specific IDs |
| \`loop_connect\` | Find related insights |
| \`loop_probe\` | Ask structured questions |
| \`loop_handoff\` | End session gracefully |
| \`loop_task_create\` | Create a new task |
| \`loop_task_update\` | Update task status/priority |
| \`loop_task_list\` | List tasks with filters |
| \`loop_insight_update\` | Update insight tags/links |
| \`loop_update_summary\` | Update repo context |
| \`loop_export\` | Export to JSON files |

---

## Customization

Edit this file to add project-specific rules, conventions, or workflow adjustments.
The agent reads this on every \`loop_orient\` call.

---

*"One task, one session, one handoff. Context stays fresh."*
`;

/**
 * AGENTS.md hook content
 */
const AGENTS_HOOK = `
## LoopFlow Workflow

This project uses LoopFlow for AI-assisted development.

**At the start of every session**, call the \`loop_orient\` MCP tool to get situational awareness.

See \`.loop-flow/WORKFLOW.md\` for methodology details.
`;

/**
 * Initialize LoopFlow for a repository
 */
export async function initLoopFlow(options: InitOptions = {}): Promise<InitResult> {
  const targetPath = options.path || process.cwd();
  const loopFlowDir = path.join(targetPath, ".loop-flow");
  const planDir = path.join(loopFlowDir, "plan");
  
  const result: InitResult = {
    success: false,
    path: targetPath,
    created: [],
    skipped: [],
  };

  try {
    // Check if already initialized
    if (fs.existsSync(loopFlowDir) && !options.force) {
      const dbExists = fs.existsSync(path.join(loopFlowDir, "loopflow.db"));
      if (dbExists) {
        result.error = "LoopFlow already initialized. Use --force to reinitialize.";
        return result;
      }
    }

    // Create directories
    if (!fs.existsSync(loopFlowDir)) {
      fs.mkdirSync(loopFlowDir, { recursive: true });
      result.created.push(".loop-flow/");
    }
    
    if (!fs.existsSync(planDir)) {
      fs.mkdirSync(planDir, { recursive: true });
      result.created.push(".loop-flow/plan/");
    }

    // Create SQLite database
    const dbPath = path.join(loopFlowDir, "loopflow.db");
    const dbExisted = fs.existsSync(dbPath);
    const db = openDatabase(dbPath);
    db.close();
    
    if (!dbExisted) {
      result.created.push("loopflow.db");
    } else {
      result.skipped.push("loopflow.db (already exists)");
    }

    // Create WORKFLOW.md
    const workflowPath = path.join(loopFlowDir, "WORKFLOW.md");
    if (!fs.existsSync(workflowPath)) {
      fs.writeFileSync(workflowPath, DEFAULT_WORKFLOW);
      result.created.push("WORKFLOW.md");
    } else {
      result.skipped.push("WORKFLOW.md (already exists)");
    }

    // Handle AGENTS.md
    if (!options.noAgentsMd) {
      const agentsMdPath = path.join(targetPath, "AGENTS.md");
      
      if (fs.existsSync(agentsMdPath)) {
        // Check if hook already exists
        const content = fs.readFileSync(agentsMdPath, "utf-8");
        if (!content.includes("loop_orient")) {
          // Append hook to existing AGENTS.md
          fs.appendFileSync(agentsMdPath, "\n" + AGENTS_HOOK);
          result.created.push("AGENTS.md (hook added)");
        } else {
          result.skipped.push("AGENTS.md (hook already present)");
        }
      } else {
        // Create new AGENTS.md with just the hook
        const newAgentsMd = `# Agent Instructions\n${AGENTS_HOOK}`;
        fs.writeFileSync(agentsMdPath, newAgentsMd);
        result.created.push("AGENTS.md");
      }
    }

    // Create empty JSON files for backward compatibility
    const insightsPath = path.join(planDir, "insights.json");
    if (!fs.existsSync(insightsPath)) {
      fs.writeFileSync(insightsPath, JSON.stringify({ insights: [] }, null, 2));
      result.created.push("plan/insights.json");
    }

    const backlogPath = path.join(planDir, "backlog.json");
    if (!fs.existsSync(backlogPath)) {
      const emptyBacklog = {
        project: path.basename(targetPath),
        last_updated: new Date().toISOString().split("T")[0],
        tasks: []
      };
      fs.writeFileSync(backlogPath, JSON.stringify(emptyBacklog, null, 2));
      result.created.push("plan/backlog.json");
    }

    result.success = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Format init result for CLI output
 */
export function formatInitResult(result: InitResult): string {
  const lines: string[] = [];
  
  if (result.success) {
    lines.push(`✓ LoopFlow initialized in ${result.path}`);
    lines.push("");
    
    if (result.created.length > 0) {
      lines.push("Created:");
      result.created.forEach(f => lines.push(`  + ${f}`));
    }
    
    if (result.skipped.length > 0) {
      lines.push("");
      lines.push("Skipped:");
      result.skipped.forEach(f => lines.push(`  - ${f}`));
    }
    
    lines.push("");
    lines.push("Next steps:");
    lines.push("  1. Configure your AI tool to use the LoopFlow MCP server");
    lines.push("  2. Start a session with 'loop_orient'");
    lines.push("");
    lines.push("MCP server config:");
    lines.push(`  Command: npx loop-flow mcp`);
    lines.push(`  Or: node ${path.join("node_modules", "loop-flow", "dist", "mcp", "server.js")}`);
    
  } else {
    lines.push(`✗ Initialization failed: ${result.error}`);
  }
  
  return lines.join("\n");
}
