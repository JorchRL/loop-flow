/**
 * LoopFlow MCP Server v0.7.0 - CRUD Edition
 * 
 * Cognitive tools for AI-assisted development:
 * - loop_orient: Full situational awareness (workflow, insights, sessions, repo context)
 * - loop_scan: Search with progressive disclosure (summaries)
 * - loop_expand: Get full content by specific IDs
 * - loop_remember: Zero-friction insight capture
 * - loop_connect: Associative memory search
 * - loop_probe: Structured user questions
 * - loop_handoff: Session transitions (graceful or emergency)
 * - loop_export: Generate JSON files from SQLite for git/humans
 * - loop_import: Import JSON/progress files into SQLite
 * 
 * CRUD tools (NEW in v0.7.0):
 * - loop_task_create: Create new tasks
 * - loop_task_update: Update task status, priority, etc.
 * - loop_task_list: List tasks with filters
 * - loop_insight_update: Update insight status, tags, links
 * 
 * v0.6.0:
 * - loop_handoff now creates session record in sessions table (LF-080 fix)
 * - Session ID auto-generated with date and sequential number
 * 
 * v0.5.0:
 * - Sessions table (parsed from progress.txt)
 * - Repo context (agent-maintained summary + suggested actions)
 * - Paginated insights with is_complete flag
 * - loop_update_summary tool for agent to update repo context
 * 
 * Architecture: SQLite is source of truth. JSON files are import/export format.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { initializeDatabase, importFromJson, importProgress, type LoopFlowDatabase } from "../db/database.js";
import { summarizeInsight } from "../rules/summarization.js";
import { generateInsightsJson, generateBacklogJson } from "../rules/export.js";

// Constants for pagination
const INSIGHTS_PAGE_SIZE = 50; // Max insights to return in orient before suggesting loop_expand

// =============================================================================
// State Management
// =============================================================================

interface SessionState {
  repoPath: string;
  repoName: string;
  currentTask: string | null;
  momentum: "starting" | "flowing" | "wrapping-up";
  startedAt: string;
  insightsCaptured: number;
  database: LoopFlowDatabase;
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

// Helper to get or create database for a repo
function getDatabase(repoPath: string): LoopFlowDatabase {
  if (currentSession?.repoPath === repoPath) {
    return currentSession.database;
  }
  return initializeDatabase(repoPath);
}

// =============================================================================
// MCP Server Setup
// =============================================================================

const server = new McpServer({
  name: "loopflow",
  version: "0.6.0",
});

// =============================================================================
// TOOL: loop_orient
// "Where am I and what matters?" - Full situational awareness
// =============================================================================

server.tool(
  "loop_orient",
  "Get full situational awareness at session start: workflow rules, all insights (full content), task suggestions. This is the agent's complete project memory.",
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
            searched_path: targetPath,
            setup_instructions: {
              step_1: "Install LoopFlow CLI globally: npm install -g loop-flow",
              step_2: "Initialize in your repo: loopflow init",
              alternative: "Or run: npx loop-flow init",
            },
            what_init_does: [
              "Creates .loop-flow/ directory structure",
              "Sets up SQLite database for tasks and insights",
              "Adds WORKFLOW.md with methodology rules",
              "Adds hook to AGENTS.md for AI assistants",
            ],
            hint: "After init, call loop_orient again to start your session",
          }, null, 2),
        }],
      };
    }

    // Initialize or get database
    const database = getDatabase(repoRoot);

    // Load WORKFLOW.md - the methodology rules (FULL)
    const workflowPath = path.join(repoRoot, ".loop-flow", "WORKFLOW.md");
    let workflowContent = "";
    if (fs.existsSync(workflowPath)) {
      workflowContent = fs.readFileSync(workflowPath, "utf-8");
    }

    // Get ALL insights (paginated if too many)
    const totalInsights = database.insights.count();
    const allInsights = database.insights.findAll({}, { limit: INSIGHTS_PAGE_SIZE });
    const insightsComplete = totalInsights <= INSIGHTS_PAGE_SIZE;

    // Get tasks
    const allTasks = database.tasks.findAll();
    const activeTask = allTasks.find(t => t.status === "IN_PROGRESS");
    const todoTasks = allTasks.filter(t => t.status === "TODO");
    const highPriorityTodos = todoTasks.filter(t => t.priority === "high");
    const recentlyCompleted = allTasks
      .filter(t => t.status === "DONE")
      .slice(0, 5);

    // Get recent sessions from database
    const recentSessions = database.sessions.getRecent(5);

    // Get repo context (agent's own notes)
    const repoContext = database.repoContext.getFullContext();

    // Start or update session
    currentSession = {
      repoPath: repoRoot,
      repoName: path.basename(repoRoot),
      currentTask: activeTask?.id || null,
      momentum: "starting",
      startedAt: new Date().toISOString(),
      insightsCaptured: 0,
      database,
    };

    const orientation = {
      repo: {
        name: path.basename(repoRoot),
        path: repoRoot,
      },
      
      // Full methodology - how the agent should work
      workflow: workflowContent,
      
      // Agent's own summary of the repo (maintained by agent via loop_update_summary)
      repo_summary: {
        description: repoContext.repoSummary,
        folder_structure: repoContext.folderStructure,
        updated_at: repoContext.lastUpdated,
        updated_by_session: repoContext.lastUpdatedBySession,
      },
      
      // Agent's notes for this session (set by previous session's handoff)
      suggested_actions: repoContext.suggestedActions,
      
      // Recent sessions (structured from progress.txt)
      recent_sessions: recentSessions.map(s => ({
        id: s.id,
        date: s.date,
        task: s.task_id ? `${s.task_id} ${s.task_type || ""} ${s.task_title || ""}`.trim() : null,
        outcome: s.outcome,
        summary: s.summary.substring(0, 300) + (s.summary.length > 300 ? "..." : ""),
      })),
      
      // Full insights (or paginated subset)
      insights: {
        items: allInsights.map(i => ({
          id: i.id,
          content: i.content,  // FULL content
          type: i.type,
          status: i.status,
          tags: i.tags ? JSON.parse(i.tags) : [],
          links: i.links ? JSON.parse(i.links) : [],
          notes: i.notes,
          created_at: i.created_at,
        })),
        total_count: totalInsights,
        is_complete: insightsComplete,
        message: insightsComplete 
          ? null 
          : `Showing ${INSIGHTS_PAGE_SIZE} of ${totalInsights} insights. Use loop_scan to search or loop_expand to get specific insights.`,
      },
      
      // Backlog summary
      backlog: {
        in_progress: activeTask ? [{
          id: activeTask.id,
          title: activeTask.title,
          description: activeTask.description,
          status: activeTask.status,
        }] : [],
        high_priority_pending: highPriorityTodos.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          depends_on: t.depends_on ? JSON.parse(t.depends_on) : [],
        })),
        recently_completed: recentlyCompleted.map(t => ({
          id: t.id,
          title: t.title,
        })),
        total_count: allTasks.length,
        stats: {
          todo: todoTasks.length,
          in_progress: allTasks.filter(t => t.status === "IN_PROGRESS").length,
          done: allTasks.filter(t => t.status === "DONE").length,
        },
      },
      
      // Quick stats
      quick_stats: {
        total_insights: totalInsights,
        insights_by_type: {
          process: database.insights.count({ types: ["process"] }),
          domain: database.insights.count({ types: ["domain"] }),
          architecture: database.insights.count({ types: ["architecture"] }),
          edge_case: database.insights.count({ types: ["edge_case"] }),
          technical: database.insights.count({ types: ["technical"] }),
        },
        total_sessions: database.sessions.count(),
      },
      
      // Guidance
      hints: [
        repoContext.suggestedActions ? null : "No suggested_actions from previous session - ask user what to work on",
        !repoContext.repoSummary ? "Consider using loop_update_summary to set repo description for future sessions" : null,
        activeTask ? `Task ${activeTask.id} is IN_PROGRESS - finish or handoff` : null,
        !insightsComplete ? "Some insights not shown - use loop_scan to search" : null,
      ].filter(Boolean),
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
// TOOL: loop_update_summary
// "Update my notes about this repo" - agent-maintained context
// =============================================================================

server.tool(
  "loop_update_summary",
  "Update the agent's own summary of the repo. This is YOUR memory - update it whenever you learn something important about the repo structure or want to leave notes for the next session.",
  {
    repo_summary: z.string().optional().describe("High-level description of the repo (what it is, current state)"),
    folder_structure: z.string().optional().describe("Annotated folder tree of key directories"),
    suggested_actions: z.string().optional().describe("Free-form notes for the next session - what to do next, warnings, context"),
  },
  async ({ repo_summary, folder_structure, suggested_actions }) => {
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

    const sessionId = `${new Date().toISOString().split("T")[0]}-current`;
    const updates: Record<string, string> = {};

    if (repo_summary !== undefined) {
      updates.repo_summary = repo_summary;
    }
    if (folder_structure !== undefined) {
      updates.folder_structure = folder_structure;
    }
    if (suggested_actions !== undefined) {
      updates.suggested_actions = suggested_actions;
    }

    if (Object.keys(updates).length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "No updates provided. Provide at least one of: repo_summary, folder_structure, suggested_actions",
          }, null, 2),
        }],
      };
    }

    currentSession.database.repoContext.setMultiple(
      updates as Record<"repo_summary" | "folder_structure" | "suggested_actions", string>,
      sessionId
    );

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          updated: Object.keys(updates),
          message: "Repo context updated. This will be available in the next loop_orient.",
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop_scan (Progressive Disclosure Layer 1)
// "Search and get summaries" - token efficient
// =============================================================================

server.tool(
  "loop_scan",
  "Search insights and tasks, returning summaries (not full content). Use loop_expand to get details for specific IDs.",
  {
    query: z.string().describe("Search query (supports multiple words)"),
    scope: z.enum(["all", "insights", "tasks"]).optional().describe("What to search (default: all)"),
    types: z.array(z.string()).optional().describe("Filter insight types (process, domain, architecture, edge_case, technical)"),
    statuses: z.array(z.string()).optional().describe("Filter by status"),
    limit: z.number().optional().describe("Max results (default: 20, max: 50)"),
  },
  async ({ query, scope = "all", types, statuses, limit = 20 }) => {
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

    const effectiveLimit = Math.min(limit, 50);
    const results: {
      insights: Array<{ id: string; summary: string; type: string; status: string }>;
      tasks: Array<{ id: string; summary: string; status: string; priority: string }>;
      truncated: boolean;
      hint: string;
    } = {
      insights: [],
      tasks: [],
      truncated: false,
      hint: "Use loop_expand(['ID1', 'ID2']) to get full content for specific items",
    };

    // Search insights
    if (scope === "all" || scope === "insights") {
      const insightResults = currentSession.database.insights.search(
        query,
        { types, statuses },
        { limit: effectiveLimit }
      );
      
      results.insights = insightResults.map(i => ({
        id: i.id,
        summary: i.summary || i.content.substring(0, 100) + "...",
        type: i.type,
        status: i.status,
      }));

      if (insightResults.length >= effectiveLimit) {
        results.truncated = true;
      }
    }

    // Search tasks
    if (scope === "all" || scope === "tasks") {
      const taskResults = currentSession.database.tasks.search(
        query,
        { statuses },
        { limit: effectiveLimit }
      );
      
      results.tasks = taskResults.map(t => ({
        id: t.id,
        summary: t.summary || t.title,
        status: t.status,
        priority: t.priority,
      }));

      if (taskResults.length >= effectiveLimit) {
        results.truncated = true;
      }
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop_expand (NEW - Progressive Disclosure Layer 3)
// "Get full details" - when you need the complete content
// =============================================================================

server.tool(
  "loop_expand",
  "Get full content for specific insight or task IDs. Use after loop_scan to dive deeper.",
  {
    ids: z.array(z.string()).describe("IDs to expand (e.g., ['INS-001', 'LF-042'])"),
    include_links: z.boolean().optional().describe("Also expand linked insights (default: false)"),
  },
  async ({ ids, include_links = false }) => {
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

    const insightIds = ids.filter(id => id.startsWith("INS-"));
    const taskIds = ids.filter(id => id.startsWith("LF-"));

    const results: {
      insights: Array<{
        id: string;
        content: string;
        type: string;
        status: string;
        tags: string[];
        links: string[];
        source: unknown;
        notes: string | null;
        created_at: string;
      }>;
      tasks: Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        depends_on: string[];
        acceptance_criteria: string[];
        notes: string | null;
      }>;
      linked_insights: Array<{
        id: string;
        content: string;
        type: string;
      }>;
      not_found: string[];
    } = {
      insights: [],
      tasks: [],
      linked_insights: [],
      not_found: [],
    };

    // Expand insights
    const foundInsights = currentSession.database.insights.findByIds(insightIds);
    const linkedIds = new Set<string>();

    for (const insight of foundInsights) {
      const links = insight.links ? JSON.parse(insight.links) as string[] : [];
      if (include_links) {
        links.forEach(id => linkedIds.add(id));
      }

      results.insights.push({
        id: insight.id,
        content: insight.content,
        type: insight.type,
        status: insight.status,
        tags: insight.tags ? JSON.parse(insight.tags) : [],
        links,
        source: insight.source ? JSON.parse(insight.source) : null,
        notes: insight.notes,
        created_at: insight.created_at,
      });
    }

    // Track not found
    for (const id of insightIds) {
      if (!foundInsights.find(i => i.id === id)) {
        results.not_found.push(id);
      }
    }

    // Expand tasks
    const foundTasks = currentSession.database.tasks.findByIds(taskIds);
    
    for (const task of foundTasks) {
      results.tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        depends_on: task.depends_on ? JSON.parse(task.depends_on) : [],
        acceptance_criteria: task.acceptance_criteria ? JSON.parse(task.acceptance_criteria) : [],
        notes: task.notes,
      });
    }

    // Track not found
    for (const id of taskIds) {
      if (!foundTasks.find(t => t.id === id)) {
        results.not_found.push(id);
      }
    }

    // Expand linked insights if requested
    if (include_links && linkedIds.size > 0) {
      // Remove already-expanded insights
      for (const insight of foundInsights) {
        linkedIds.delete(insight.id);
      }

      const linkedInsights = currentSession.database.insights.findByIds(Array.from(linkedIds));
      results.linked_insights = linkedInsights.map(i => ({
        id: i.id,
        content: i.content,
        type: i.type,
      }));
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop_remember
// "This feels important" - zero friction capture
// =============================================================================

server.tool(
  "loop_remember",
  "Capture an insight with zero friction. Don't derail - just snapshot and keep going. Returns the insight ID.",
  {
    content: z.string().describe("The insight to capture"),
    type: z.enum(["process", "domain", "architecture", "edge_case", "technical"]).optional()
      .describe("Type of insight (defaults to technical)"),
    tags: z.array(z.string()).optional().describe("Optional tags"),
  },
  async ({ content, type = "technical", tags = [] }) => {
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

    // Generate ID and summary
    const id = currentSession.database.insights.getNextId();
    const summary = summarizeInsight(content);

    // Insert into database (SQLite is source of truth)
    currentSession.database.insights.insert({
      id,
      content,
      summary,
      type,
      status: "unprocessed",
      tags: tags.length ? JSON.stringify(tags) : null,
      links: null,
      source: JSON.stringify({
        task: currentSession.currentTask || "ad-hoc",
        session: new Date().toISOString().split("T")[0],
      }),
      notes: null,
    });

    currentSession.insightsCaptured++;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          captured: true,
          id,
          summary,
          message: `Captured as ${id}. Keep going.`,
          session_total: currentSession.insightsCaptured,
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop_connect
// "What relates to this?" - associative memory with summaries
// =============================================================================

server.tool(
  "loop_connect",
  "Find insights, tasks, and knowledge related to a concept. Associative memory - not exhaustive search.",
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

    // Search insights using FTS
    const matchingInsights = currentSession.database.insights.search(query, {}, { limit: 10 });

    // Collect linked IDs
    const linkedIds = new Set<string>();
    for (const insight of matchingInsights) {
      if (insight.links) {
        const links = JSON.parse(insight.links) as string[];
        links.forEach(id => linkedIds.add(id));
      }
    }

    // Remove already-matched IDs
    for (const insight of matchingInsights) {
      linkedIds.delete(insight.id);
    }

    // Get linked insights (summaries only)
    const linkedInsights = currentSession.database.insights.findByIds(Array.from(linkedIds));

    // Search tasks if requested
    let matchingTasks: Array<{ id: string; summary: string; status: string }> = [];
    if (include_tasks) {
      const taskResults = currentSession.database.tasks.search(query, {}, { limit: 5 });
      matchingTasks = taskResults.map(t => ({
        id: t.id,
        summary: t.summary || t.title,
        status: t.status,
      }));
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          query,
          insights: matchingInsights.map(i => ({
            id: i.id,
            summary: i.summary || i.content.substring(0, 100) + "...",
            type: i.type,
            links: i.links ? JSON.parse(i.links) : [],
          })),
          linked_insights: linkedInsights.map(i => ({
            id: i.id,
            summary: i.summary || i.content.substring(0, 100) + "...",
            type: i.type,
            via: "link",
          })),
          tasks: matchingTasks,
          suggestion: matchingInsights.length === 0 && matchingTasks.length === 0
            ? "No direct matches. Try broader terms or use loop_expand(['ID']) for specific items."
            : "Use loop_expand(['ID1', 'ID2']) for full details.",
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop_probe
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
    const formatted = {
      formatted_question: {
        ask: question,
        context: why,
        options: options?.map((opt) => ({
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
// TOOL: loop_handoff
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
    export_files: z.boolean().optional().describe("Export JSON files for git commit (default: true for graceful, false for emergency)"),
  },
  async ({ mode, completed, in_progress, blocked_on, next_session_should, hot_context, export_files }) => {
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

    const today = new Date().toISOString().split("T")[0];
    
    // Calculate next session number for today
    const lastSession = currentSession.database.sessions.getLastSessionId();
    let sessionNumber = 1;
    if (lastSession) {
      const match = lastSession.match(/^(\d{4}-\d{2}-\d{2})-S(\d+)$/);
      if (match && match[1] === today) {
        sessionNumber = parseInt(match[2], 10) + 1;
      } else if (match && match[1] < today) {
        sessionNumber = 1; // New day, start at 1
      }
    }
    const sessionId = `${today}-S${sessionNumber}`;

    // FIRST: Save suggested_actions for next session (critical state preservation)
    if (next_session_should) {
      currentSession.database.repoContext.set(
        "suggested_actions",
        next_session_should,
        sessionId
      );
    }
    
    // Create session record (LF-080 fix)
    const outcome = mode === "emergency" ? "INTERRUPTED" : 
                    blocked_on ? "BLOCKED" : 
                    in_progress ? "PARTIAL" : "COMPLETE";
    
    const summaryParts: string[] = [];
    if (completed?.length) {
      summaryParts.push(`Completed: ${completed.join(", ")}`);
    }
    if (in_progress) {
      summaryParts.push(`In progress: ${in_progress}`);
    }
    if (blocked_on) {
      summaryParts.push(`Blocked on: ${blocked_on}`);
    }
    if (hot_context?.length) {
      summaryParts.push(`Hot context: ${hot_context.join("; ")}`);
    }
    
    currentSession.database.sessions.upsert({
      id: sessionId,
      date: today,
      session_number: sessionNumber,
      task_id: currentSession.currentTask,
      task_type: null, // Could be extracted from task if needed
      task_title: null,
      outcome,
      summary: summaryParts.join("\n") || "No summary provided",
      learnings: null,
      files_changed: null,
      insights_added: currentSession.insightsCaptured > 0 
        ? JSON.stringify([`${currentSession.insightsCaptured} insights captured`])
        : null,
    });

    const handoff = {
      mode,
      session: {
        id: sessionId,
        repo: currentSession.repoName,
        task: currentSession.currentTask,
        duration: `${Math.round((Date.now() - new Date(currentSession.startedAt).getTime()) / 60000)} minutes`,
        insights_captured: currentSession.insightsCaptured,
        outcome,
      },
      completed: completed || [],
      in_progress: in_progress || null,
      blocked_on: blocked_on || null,
      next_session_should: next_session_should || "Continue from where we left off",
      hot_context: hot_context || [],
      resume_file: null as string | null,
      exported_files: [] as string[],
      suggested_actions_saved: !!next_session_should,
      session_record_created: true,
    };

    // Export files (default: true for graceful, false for emergency)
    const shouldExport = export_files ?? (mode === "graceful");
    if (shouldExport) {
      const planDir = path.join(currentSession.repoPath, ".loop-flow", "plan");
      if (!fs.existsSync(planDir)) {
        fs.mkdirSync(planDir, { recursive: true });
      }

      // Export insights
      const allInsights = currentSession.database.insights.findAll({}, { limit: 10000 });
      const insightsJson = generateInsightsJson(allInsights);
      fs.writeFileSync(
        path.join(planDir, "insights.json"),
        JSON.stringify(insightsJson, null, 2)
      );
      handoff.exported_files.push("insights.json");

      // Export backlog
      const allTasks = currentSession.database.tasks.findAll({}, { limit: 10000 });
      const backlogJson = generateBacklogJson(allTasks, currentSession.repoName);
      fs.writeFileSync(
        path.join(planDir, "backlog.json"),
        JSON.stringify(backlogJson, null, 2)
      );
      handoff.exported_files.push("backlog.json");
    }

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

    // Close database connection
    currentSession.database.close();
    currentSession = null;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          handoff,
          message: mode === "emergency" 
            ? "Emergency handoff complete. RESUME.md created. Next session will pick up."
            : "Graceful handoff complete. State preserved. suggested_actions saved for next session.",
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop_export
// "Generate files from SQLite" - on-demand export for git/humans
// =============================================================================

server.tool(
  "loop_export",
  "Export SQLite data to JSON files for git commits and human review. SQLite is source of truth; this generates snapshots.",
  {
    include_insights: z.boolean().optional().describe("Export insights.json (default: true)"),
    include_backlog: z.boolean().optional().describe("Export backlog.json (default: true)"),
    project_name: z.string().optional().describe("Project name for backlog header"),
    project_notes: z.string().optional().describe("Notes for backlog header"),
  },
  async ({ include_insights = true, include_backlog = true, project_name, project_notes }) => {
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

    const results: {
      exported: string[];
      stats: { insights: number; tasks: number };
      paths: { insights?: string; backlog?: string };
    } = {
      exported: [],
      stats: { insights: 0, tasks: 0 },
      paths: {},
    };

    const planDir = path.join(currentSession.repoPath, ".loop-flow", "plan");
    
    // Ensure plan directory exists
    if (!fs.existsSync(planDir)) {
      fs.mkdirSync(planDir, { recursive: true });
    }

    // Export insights
    if (include_insights) {
      const allInsights = currentSession.database.insights.findAll({}, { limit: 10000 });
      const insightsJson = generateInsightsJson(allInsights);
      const insightsPath = path.join(planDir, "insights.json");
      
      fs.writeFileSync(insightsPath, JSON.stringify(insightsJson, null, 2));
      
      results.exported.push("insights.json");
      results.stats.insights = allInsights.length;
      results.paths.insights = insightsPath;
    }

    // Export backlog
    if (include_backlog) {
      const allTasks = currentSession.database.tasks.findAll({}, { limit: 10000 });
      const backlogJson = generateBacklogJson(
        allTasks,
        project_name || currentSession.repoName,
        project_notes || ""
      );
      const backlogPath = path.join(planDir, "backlog.json");
      
      fs.writeFileSync(backlogPath, JSON.stringify(backlogJson, null, 2));
      
      results.exported.push("backlog.json");
      results.stats.tasks = allTasks.length;
      results.paths.backlog = backlogPath;
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: `Exported ${results.exported.join(", ")} from SQLite`,
          ...results,
          hint: "These files are now ready for git commit. They're snapshots of SQLite data.",
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// TOOL: loop_import
// "Import JSON files into SQLite" - one-time migration or force refresh
// =============================================================================

server.tool(
  "loop_import",
  "Import JSON files (insights.json, backlog.json) into SQLite. Use for initial migration or to force refresh from edited JSON files.",
  {
    force: z.boolean().optional().describe("Force reimport even if data exists (will skip existing IDs)"),
  },
  async ({ force = false }) => {
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

    const hasData = currentSession.database.insights.count() > 0 || 
                    currentSession.database.tasks.count() > 0;

    if (hasData && !force) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "Database already has data. Use force=true to import anyway (existing IDs will be skipped).",
            current_data: {
              insights: currentSession.database.insights.count(),
              tasks: currentSession.database.tasks.count(),
              sessions: currentSession.database.sessions.count(),
            },
          }, null, 2),
        }],
      };
    }

    // Import insights and tasks from JSON
    const jsonStats = importFromJson(currentSession.database, currentSession.repoPath);
    
    // Import sessions from progress.txt
    const progressStats = importProgress(currentSession.database, currentSession.repoPath);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: "Imported files into SQLite",
          stats: {
            insights_imported: jsonStats.insightsImported,
            tasks_imported: jsonStats.tasksImported,
            sessions_imported: progressStats.imported,
            skipped: jsonStats.skipped + progressStats.skipped,
          },
          hint: (jsonStats.skipped + progressStats.skipped) > 0 
            ? `${jsonStats.skipped + progressStats.skipped} items were skipped (already exist in database)`
            : "All items imported successfully",
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// CRUD Tools: Task Management
// =============================================================================

server.tool(
  "loop_task_create",
  "Create a new task in the backlog",
  {
    id: z.string().describe("Task ID (e.g., 'LF-104')"),
    title: z.string().describe("Task title including type prefix (e.g., '[IMPL] Add feature X')"),
    description: z.string().optional().describe("Detailed description"),
    priority: z.enum(["high", "medium", "low"]).default("medium").describe("Task priority"),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELLED"]).default("TODO"),
    depends_on: z.array(z.string()).optional().describe("IDs of tasks this depends on"),
    acceptance_criteria: z.array(z.string()).optional().describe("List of acceptance criteria"),
    notes: z.string().optional().describe("Additional notes"),
  },
  async ({ id, title, description, priority, status, depends_on, acceptance_criteria, notes }) => {
    if (!currentSession) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "No active session. Call loop_orient first." }, null, 2),
        }],
      };
    }

    // Check if task already exists
    const existing = currentSession.database.tasks.findById(id);
    if (existing) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ 
            error: `Task ${id} already exists`,
            existing: { id: existing.id, title: existing.title, status: existing.status }
          }, null, 2),
        }],
      };
    }

    // Create task
    const task = currentSession.database.tasks.insert({
      id,
      title,
      description: description || null,
      summary: title, // Use title as summary
      status,
      priority,
      depends_on: depends_on ? JSON.stringify(depends_on) : null,
      acceptance_criteria: acceptance_criteria ? JSON.stringify(acceptance_criteria) : null,
      test_file: null,
      notes: notes || null,
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          created: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
          message: `Task ${id} created`,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "loop_task_update",
  "Update an existing task (status, priority, notes, etc.)",
  {
    id: z.string().describe("Task ID to update"),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELLED"]).optional(),
    priority: z.enum(["high", "medium", "low"]).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    depends_on: z.array(z.string()).optional(),
    acceptance_criteria: z.array(z.string()).optional(),
  },
  async ({ id, status, priority, title, description, notes, depends_on, acceptance_criteria }) => {
    if (!currentSession) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "No active session. Call loop_orient first." }, null, 2),
        }],
      };
    }

    const existing = currentSession.database.tasks.findById(id);
    if (!existing) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: `Task ${id} not found` }, null, 2),
        }],
      };
    }

    // Build changes object
    const changes: Record<string, unknown> = {};
    if (status !== undefined) changes.status = status;
    if (priority !== undefined) changes.priority = priority;
    if (title !== undefined) {
      changes.title = title;
      changes.summary = title;
    }
    if (description !== undefined) changes.description = description;
    if (notes !== undefined) changes.notes = notes;
    if (depends_on !== undefined) changes.depends_on = JSON.stringify(depends_on);
    if (acceptance_criteria !== undefined) changes.acceptance_criteria = JSON.stringify(acceptance_criteria);

    if (Object.keys(changes).length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "No changes specified" }, null, 2),
        }],
      };
    }

    const updated = currentSession.database.tasks.update(id, changes);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          updated: true,
          task: {
            id: updated!.id,
            title: updated!.title,
            status: updated!.status,
            priority: updated!.priority,
          },
          changes: Object.keys(changes),
          message: `Task ${id} updated`,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "loop_task_list",
  "List tasks with optional filters",
  {
    status: z.array(z.string()).optional().describe("Filter by status (e.g., ['TODO', 'IN_PROGRESS'])"),
    priority: z.array(z.string()).optional().describe("Filter by priority (e.g., ['high'])"),
    limit: z.number().optional().default(20).describe("Max results"),
  },
  async ({ status, priority, limit }) => {
    if (!currentSession) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "No active session. Call loop_orient first." }, null, 2),
        }],
      };
    }

    const tasks = currentSession.database.tasks.findAll(
      { statuses: status, priorities: priority },
      { limit }
    );

    const total = currentSession.database.tasks.count({ statuses: status, priorities: priority });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
          })),
          count: tasks.length,
          total,
          truncated: tasks.length < total,
        }, null, 2),
      }],
    };
  }
);

// =============================================================================
// CRUD Tools: Insight Management
// =============================================================================

server.tool(
  "loop_insight_update",
  "Update an existing insight (status, tags, links, notes)",
  {
    id: z.string().describe("Insight ID to update"),
    status: z.enum(["unprocessed", "discussed"]).optional(),
    tags: z.array(z.string()).optional().describe("Replace tags"),
    add_tags: z.array(z.string()).optional().describe("Add to existing tags"),
    links: z.array(z.string()).optional().describe("Replace linked insight IDs"),
    add_links: z.array(z.string()).optional().describe("Add to existing links"),
    notes: z.string().optional(),
  },
  async ({ id, status, tags, add_tags, links, add_links, notes }) => {
    if (!currentSession) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "No active session. Call loop_orient first." }, null, 2),
        }],
      };
    }

    const existing = currentSession.database.insights.findById(id);
    if (!existing) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: `Insight ${id} not found` }, null, 2),
        }],
      };
    }

    // Build changes object
    const changes: Record<string, unknown> = {};
    
    if (status !== undefined) changes.status = status;
    if (notes !== undefined) changes.notes = notes;
    
    // Handle tags
    if (tags !== undefined) {
      changes.tags = JSON.stringify(tags);
    } else if (add_tags !== undefined) {
      const existingTags = existing.tags ? JSON.parse(existing.tags) : [];
      const newTags = [...new Set([...existingTags, ...add_tags])];
      changes.tags = JSON.stringify(newTags);
    }
    
    // Handle links
    if (links !== undefined) {
      changes.links = JSON.stringify(links);
    } else if (add_links !== undefined) {
      const existingLinks = existing.links ? JSON.parse(existing.links) : [];
      const newLinks = [...new Set([...existingLinks, ...add_links])];
      changes.links = JSON.stringify(newLinks);
    }

    if (Object.keys(changes).length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ error: "No changes specified" }, null, 2),
        }],
      };
    }

    const updated = currentSession.database.insights.update(id, changes);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          updated: true,
          insight: {
            id: updated!.id,
            type: updated!.type,
            status: updated!.status,
            summary: updated!.summary || updated!.content.substring(0, 80) + "...",
          },
          changes: Object.keys(changes),
          message: `Insight ${id} updated`,
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

    // Use database if available
    if (currentSession) {
      const processInsights = currentSession.database.insights.findAll(
        { types: ["process"] },
        { limit: 50 }
      );
      
      // Return summaries only
      const summaries = processInsights.map(i => ({
        id: i.id,
        summary: i.summary || i.content.substring(0, 100) + "...",
        type: i.type,
      }));

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(summaries, null, 2),
        }],
      };
    }

    // Fallback to file
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
      ?.filter((i: { type: string; tags?: string[] }) => 
        i.type === "process" || i.tags?.includes("loop-flow-core")
      ) || [];

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
  console.error("LoopFlow MCP Server v0.7.0 (CRUD Edition) running on stdio");
}

main().catch(console.error);
