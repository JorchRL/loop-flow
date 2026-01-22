/**
 * LoopFlow MCP Server - SQLite Source of Truth Edition
 * 
 * Cognitive tools with token-efficient retrieval:
 * - loop_orient: Situational awareness (uses summaries)
 * - loop_scan: Search with progressive disclosure (Layer 1)
 * - loop_expand: Get full content by IDs (Layer 3)
 * - loop_remember: Zero-friction insight capture (writes to SQLite only)
 * - loop_connect: Associative memory (uses summaries)
 * - loop_probe: Structured user questions
 * - loop_handoff: Session transitions (optionally exports to JSON)
 * - loop_export: Generate JSON files from SQLite for git/humans
 * - loop_import: Import JSON files into SQLite (migration or refresh)
 * 
 * Architecture: SQLite is source of truth. JSON files are import/export format.
 * - Fresh install: JSON files are auto-imported into SQLite (one-time migration)
 * - During work: All changes go to SQLite only (fast, no token waste)
 * - For git: Call loop_export or use graceful handoff to generate JSON snapshots
 * - Manual refresh: Call loop_import to re-import from edited JSON files
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { initializeDatabase, importFromJson, type LoopFlowDatabase } from "../db/database.js";
import { summarizeInsight } from "../rules/summarization.js";
import { generateInsightsJson, generateBacklogJson } from "../rules/export.js";

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
  version: "0.3.0",
});

// =============================================================================
// TOOL: loop_orient
// "Where am I and what matters?" - uses summaries for token efficiency
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

    // Initialize or get database
    // SQLite is source of truth - no JSON sync needed on orient
    const database = getDatabase(repoRoot);

    // Find active task
    const allTasks = database.tasks.findAll();
    const activeTask = allTasks.find(t => t.status === "IN_PROGRESS");
    const todoTasks = allTasks.filter(t => t.status === "TODO");
    const highPriorityTodos = todoTasks.filter(t => t.priority === "high");

    // Get recent/hot insights (summaries only!)
    const hotInsights = database.insights
      .findAll({ statuses: ["unprocessed"] }, { limit: 5 });

    // Parse last session from progress.txt (still file-based for now)
    const progressPath = path.join(repoRoot, ".loop-flow", "plan", "progress.txt");
    let lastSession = "Unknown";
    if (fs.existsSync(progressPath)) {
      const progress = fs.readFileSync(progressPath, "utf-8");
      const lines = progress.split("\n");
      const lastHeader = lines.findLast((l: string) => l.startsWith("## "));
      lastSession = lastHeader?.replace("## ", "") || "Unknown";
    }

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
      session: {
        last: lastSession,
        current_task: activeTask ? {
          id: activeTask.id,
          title: activeTask.summary || activeTask.title, // Use summary!
          status: activeTask.status,
        } : null,
        momentum: "starting",
      },
      suggested_tasks: highPriorityTodos.slice(0, 3).map(t => ({
        id: t.id,
        title: t.summary || t.title, // Use summary!
        priority: t.priority,
        why: t.depends_on ? `Unblocked (deps: ${t.depends_on})` : "High priority, no blockers",
      })),
      hot_insights: hotInsights.map(i => ({
        id: i.id,
        summary: i.summary || i.content.substring(0, 100) + "...", // Use summary!
        type: i.type,
        status: i.status,
      })),
      landmines: [
        "Don't commit without permission",
        "One task per session",
        activeTask ? `Task ${activeTask.id} is IN_PROGRESS - finish or handoff` : null,
      ].filter(Boolean),
      quick_stats: {
        total_tasks: allTasks.length,
        todo: todoTasks.length,
        insights: database.insights.count(),
        unprocessed_insights: database.insights.count({ statuses: ["unprocessed"] }),
      },
      hint: "Use loop_scan to search, loop_expand to get full details",
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
// TOOL: loop_scan (NEW - Progressive Disclosure Layer 1)
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
      exported_files: [] as string[],
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
            : "Graceful handoff complete. State preserved.",
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
            },
          }, null, 2),
        }],
      };
    }

    const stats = importFromJson(currentSession.database, currentSession.repoPath);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: "Imported JSON files into SQLite",
          stats: {
            insights_imported: stats.insightsImported,
            tasks_imported: stats.tasksImported,
            skipped: stats.skipped,
          },
          hint: stats.skipped > 0 
            ? `${stats.skipped} items were skipped (already exist in database)`
            : "All items imported successfully",
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
  console.error("LoopFlow MCP Server v0.3.0 (SQLite Source of Truth) running on stdio");
}

main().catch(console.error);
