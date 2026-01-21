/**
 * LoopFlow MCP Server - Cognitive Tools Edition
 * 
 * Tools designed for how AI agents think:
 * - loop.orient: Situational awareness
 * - loop.remember: Zero-friction insight capture
 * - loop.connect: Associative memory
 * - loop.probe: Structured user questions
 * - loop.handoff: Session transitions
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// State Management (file-based for now, SQLite later)
// =============================================================================

interface SessionState {
  repoPath: string;
  repoName: string;
  currentTask: string | null;
  momentum: "starting" | "flowing" | "wrapping-up";
  startedAt: string;
  insightsCaptured: number;
}

interface FileBasedState {
  backlog: any;
  insights: any;
  progress: string;
  workflow: string;
}

let currentSession: SessionState | null = null;

function findLoopFlowRoot(startPath: string): string | null {
  let current = startPath;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".loop-flow"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

function loadFileBasedState(repoPath: string): FileBasedState | null {
  const loopFlowDir = path.join(repoPath, ".loop-flow");
  if (!fs.existsSync(loopFlowDir)) return null;

  try {
    const backlogPath = path.join(loopFlowDir, "plan", "backlog.json");
    const insightsPath = path.join(loopFlowDir, "plan", "insights.json");
    const progressPath = path.join(loopFlowDir, "plan", "progress.txt");
    const workflowPath = path.join(loopFlowDir, "WORKFLOW.md");

    return {
      backlog: fs.existsSync(backlogPath) 
        ? JSON.parse(fs.readFileSync(backlogPath, "utf-8")) 
        : { tasks: [] },
      insights: fs.existsSync(insightsPath)
        ? JSON.parse(fs.readFileSync(insightsPath, "utf-8"))
        : { insights: [] },
      progress: fs.existsSync(progressPath)
        ? fs.readFileSync(progressPath, "utf-8")
        : "",
      workflow: fs.existsSync(workflowPath)
        ? fs.readFileSync(workflowPath, "utf-8")
        : "",
    };
  } catch (e) {
    return null;
  }
}

function saveInsight(repoPath: string, insight: any): string {
  const insightsPath = path.join(repoPath, ".loop-flow", "plan", "insights.json");
  const data = JSON.parse(fs.readFileSync(insightsPath, "utf-8"));
  
  // Generate next ID
  const existingIds = data.insights.map((i: any) => parseInt(i.id.replace("INS-", "")));
  const nextId = Math.max(0, ...existingIds) + 1;
  const id = `INS-${String(nextId).padStart(3, "0")}`;
  
  const newInsight = {
    id,
    content: insight.content,
    type: insight.type || "technical",
    status: "unprocessed",
    source: {
      task: currentSession?.currentTask || "ad-hoc",
      session: new Date().toISOString().split("T")[0],
    },
    tags: insight.tags || [],
    links: [],
    created: new Date().toISOString().split("T")[0],
  };
  
  data.insights.push(newInsight);
  fs.writeFileSync(insightsPath, JSON.stringify(data, null, 2));
  
  return id;
}

// =============================================================================
// MCP Server Setup
// =============================================================================

const server = new McpServer({
  name: "loopflow",
  version: "0.1.0",
});

// =============================================================================
// TOOL: loop.orient
// "Where am I and what matters?"
// =============================================================================

server.tool(
  "loop_orient",
  "Get situational awareness: current repo, active task, hot insights, momentum. Call this at session start or when you feel lost.",
  {
    repo_path: z.string().optional().describe("Path to repo (defaults to cwd)"),
  },
  async ({ repo_path }) => {
    const targetPath = repo_path || process.cwd();
    const repoRoot = findLoopFlowRoot(targetPath);
    
    if (!repoRoot) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "No .loop-flow directory found",
            suggestion: "Run in a repo with LoopFlow installed, or provide repo_path",
          }, null, 2),
        }],
      };
    }

    const state = loadFileBasedState(repoRoot);
    if (!state) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "Could not load LoopFlow state" }, null, 2),
        }],
      };
    }

    // Find active task
    const activeTask = state.backlog.tasks?.find((t: any) => t.status === "IN_PROGRESS");
    const todoTasks = state.backlog.tasks?.filter((t: any) => t.status === "TODO") || [];
    const highPriorityTodos = todoTasks.filter((t: any) => t.priority === "high");

    // Get recent/hot insights (unprocessed or recently created)
    const hotInsights = state.insights.insights
      ?.filter((i: any) => i.status === "unprocessed" || i.tags?.includes("loop-flow-core"))
      ?.slice(-5) || [];

    // Parse last session from progress
    const progressLines = state.progress.split("\n");
    const lastSessionHeader = progressLines.findLast((l: string) => l.startsWith("## "));
    const lastSession = lastSessionHeader?.replace("## ", "") || "Unknown";

    // Start or update session
    currentSession = {
      repoPath: repoRoot,
      repoName: path.basename(repoRoot),
      currentTask: activeTask?.id || null,
      momentum: "starting",
      startedAt: new Date().toISOString(),
      insightsCaptured: 0,
    };

    const orientation = {
      repo: {
        name: path.basename(repoRoot),
        path: repoRoot,
      },
      session: {
        last: lastSession,
        current_task: activeTask ? {
          id: activeTask.id,
          title: activeTask.title,
          status: activeTask.status,
        } : null,
        momentum: "starting",
      },
      suggested_tasks: highPriorityTodos.slice(0, 3).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        why: t.depends_on?.length ? `Unblocked (deps: ${t.depends_on.join(", ")})` : "High priority, no blockers",
      })),
      hot_insights: hotInsights.map((i: any) => ({
        id: i.id,
        content: i.content.substring(0, 100) + (i.content.length > 100 ? "..." : ""),
        type: i.type,
        status: i.status,
      })),
      landmines: [
        "Don't commit without permission",
        "One task per session",
        activeTask ? `Task ${activeTask.id} is IN_PROGRESS — finish or handoff` : null,
      ].filter(Boolean),
      quick_stats: {
        total_tasks: state.backlog.tasks?.length || 0,
        todo: todoTasks.length,
        insights: state.insights.insights?.length || 0,
        unprocessed_insights: state.insights.insights?.filter((i: any) => i.status === "unprocessed").length || 0,
      },
    };

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(orientation, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop.remember
// "This feels important" - zero friction capture
// =============================================================================

server.tool(
  "loop_remember",
  "Capture an insight with zero friction. Don't derail — just snapshot and keep going. Returns the insight ID.",
  {
    content: z.string().describe("The insight to capture"),
    type: z.enum(["process", "domain", "architecture", "edge_case", "technical"]).optional()
      .describe("Type of insight (defaults to technical)"),
    tags: z.array(z.string()).optional().describe("Optional tags"),
  },
  async ({ content, type, tags }) => {
    if (!currentSession) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "No active session. Call loop_orient first.",
          }, null, 2),
        }],
      };
    }

    const id = saveInsight(currentSession.repoPath, { content, type, tags });
    currentSession.insightsCaptured++;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          captured: true,
          id,
          message: `Captured as ${id} (unprocessed). Keep going.`,
          session_total: currentSession.insightsCaptured,
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop.connect
// "What relates to this?" - associative memory
// =============================================================================

server.tool(
  "loop_connect",
  "Find insights, tasks, and knowledge related to a concept. Associative memory — not exhaustive search.",
  {
    query: z.string().describe("Concept or topic to find connections for"),
    include_tasks: z.boolean().optional().describe("Also search tasks (default true)"),
  },
  async ({ query, include_tasks = true }) => {
    if (!currentSession) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "No active session. Call loop_orient first.",
          }, null, 2),
        }],
      };
    }

    const state = loadFileBasedState(currentSession.repoPath);
    if (!state) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "Could not load state" }, null, 2),
        }],
      };
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    // Search insights
    const matchingInsights = state.insights.insights
      ?.filter((i: any) => {
        const text = `${i.content} ${i.tags?.join(" ") || ""}`.toLowerCase();
        return queryWords.some(w => text.includes(w));
      })
      ?.slice(0, 10)
      ?.map((i: any) => ({
        id: i.id,
        content: i.content,
        type: i.type,
        relevance: queryWords.filter(w => i.content.toLowerCase().includes(w)).length,
        links: i.links,
      }))
      ?.sort((a: any, b: any) => b.relevance - a.relevance) || [];

    // Search tasks if requested
    let matchingTasks: any[] = [];
    if (include_tasks) {
      matchingTasks = state.backlog.tasks
        ?.filter((t: any) => {
          const text = `${t.title} ${t.description || ""} ${t.notes || ""}`.toLowerCase();
          return queryWords.some(w => text.includes(w));
        })
        ?.slice(0, 5)
        ?.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          relevance: queryWords.filter(w => `${t.title} ${t.description || ""}`.toLowerCase().includes(w)).length,
        }))
        ?.sort((a: any, b: any) => b.relevance - a.relevance) || [];
    }

    // Find linked insights (follow the graph)
    const linkedIds = new Set<string>();
    matchingInsights.forEach((i: any) => {
      i.links?.forEach((link: string) => linkedIds.add(link));
    });
    const linkedInsights = state.insights.insights
      ?.filter((i: any) => linkedIds.has(i.id) && !matchingInsights.find((m: any) => m.id === i.id))
      ?.map((i: any) => ({
        id: i.id,
        content: i.content.substring(0, 100) + "...",
        type: i.type,
        via: "link",
      })) || [];

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          query,
          insights: matchingInsights,
          linked_insights: linkedInsights,
          tasks: matchingTasks,
          suggestion: matchingInsights.length === 0 && matchingTasks.length === 0
            ? "No direct matches. Try broader terms or check specific insight IDs."
            : null,
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop.probe
// "Ask the user this for me" - structured questions
// =============================================================================

server.tool(
  "loop_probe",
  "Ask the user a structured question with context on why you're asking. Better than open-ended 'what do you want?'",
  {
    question: z.string().describe("The question to ask"),
    why: z.string().describe("Why you need this answer (helps user understand tradeoffs)"),
    options: z.array(z.string()).optional().describe("Suggested options (user can still give custom answer)"),
    default_option: z.string().optional().describe("Recommended default if user is unsure"),
  },
  async ({ question, why, options, default_option }) => {
    // This tool doesn't actually ask — it formats the question for the agent to present
    // The agent will use this to structure their question to the user
    
    const formatted = {
      formatted_question: {
        ask: question,
        context: why,
        options: options        ?.map((opt) => ({
          label: opt,
          is_default: opt === default_option,
        })),
        note: default_option ? `If unsure, "${default_option}" is a safe choice.` : null,
      },
      instruction: "Present this question to the user. Wait for their answer before proceeding.",
    };

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop.handoff
// "I'm running out of context" - session transitions
// =============================================================================

server.tool(
  "loop_handoff",
  "End session gracefully or emergency bail. Saves state for next session to pick up seamlessly.",
  {
    mode: z.enum(["graceful", "emergency"]).describe("Graceful = normal end, Emergency = context dying"),
    completed: z.array(z.string()).optional().describe("What was completed this session"),
    in_progress: z.string().optional().describe("What's partially done"),
    blocked_on: z.string().optional().describe("What's blocking progress"),
    next_session_should: z.string().optional().describe("Instruction for next session"),
    hot_context: z.array(z.string()).optional().describe("Critical context that must not be lost"),
  },
  async ({ mode, completed, in_progress, blocked_on, next_session_should, hot_context }) => {
    if (!currentSession) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "No active session. Nothing to hand off.",
          }, null, 2),
        }],
      };
    }

    const handoff = {
      mode,
      session: {
        repo: currentSession.repoName,
        task: currentSession.currentTask,
        duration: `${Math.round((Date.now() - new Date(currentSession.startedAt).getTime()) / 60000)} minutes`,
        insights_captured: currentSession.insightsCaptured,
      },
    completed: completed || [],
    in_progress: in_progress || null,
    blocked_on: blocked_on || null,
    next_session_should: next_session_should || "Continue from where we left off",
    hot_context: hot_context || [],
    resume_file: null as string | null,
  };

  if (mode === "emergency") {
      // Write RESUME.md for emergency pickup
      const resumePath = path.join(currentSession.repoPath, ".loop-flow", "RESUME.md");
      const resumeContent = `# Emergency Session Resume

**Created**: ${new Date().toISOString()}
**Task**: ${currentSession.currentTask || "None"}

## What Was Happening
${in_progress || "Unknown"}

## Blocked On
${blocked_on || "Context limit reached"}

## Next Session Should
${next_session_should || "Review state and continue"}

## Hot Context (Don't Lose This!)
${hot_context?.map(c => `- ${c}`).join("\n") || "None captured"}

## Completed This Session
${completed?.map(c => `- ${c}`).join("\n") || "Nothing recorded"}
`;
      fs.writeFileSync(resumePath, resumeContent);
      handoff.resume_file = resumePath;
    }

    // Clear session
    currentSession = null;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          handoff,
          message: mode === "emergency" 
            ? "Emergency handoff complete. RESUME.md created. Next session will pick up."
            : "Graceful handoff complete. State preserved.",
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// Resources: Serve LoopFlow methodology
// =============================================================================

server.resource(
  "loopflow://workflow",
  "LoopFlow workflow rules (WORKFLOW.md)",
  async (uri) => {
    // Try to find workflow from current session or cwd
    const repoPath = currentSession?.repoPath || findLoopFlowRoot(process.cwd());
    if (!repoPath) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: "No LoopFlow repo found. Initialize with loop_orient first.",
        }],
      };
    }

    const workflowPath = path.join(repoPath, ".loop-flow", "WORKFLOW.md");
    if (!fs.existsSync(workflowPath)) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain", 
          text: "WORKFLOW.md not found in .loop-flow/",
        }],
      };
    }

    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: fs.readFileSync(workflowPath, "utf-8"),
      }],
    };
  }
);

server.resource(
  "loopflow://insights/process",
  "Process insights (loop-flow-core methodology learnings)",
  async (uri) => {
    const repoPath = currentSession?.repoPath || findLoopFlowRoot(process.cwd());
    if (!repoPath) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: "No LoopFlow repo found.",
        }],
      };
    }

    const insightsPath = path.join(repoPath, ".loop-flow", "plan", "insights.json");
    if (!fs.existsSync(insightsPath)) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: "insights.json not found.",
        }],
      };
    }

    const data = JSON.parse(fs.readFileSync(insightsPath, "utf-8"));
    const processInsights = data.insights
      ?.filter((i: any) => i.type === "process" || i.tags?.includes("loop-flow-core"))
      || [];

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(processInsights, null, 2),
      }],
    };
  }
);

// =============================================================================
// Start Server
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LoopFlow MCP Server running on stdio");
}

main().catch(console.error);
