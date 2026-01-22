/**
 * LoopFlow HTTP API Server
 * 
 * Provides REST API for the web UI. Uses Hono for routing.
 * In production, also serves the static UI build.
 * 
 * Lifecycle:
 * - CLI mode: runs until Ctrl+C (manual)
 * - MCP mode: auto-stops on handoff or timeout (managed)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve, type ServerType } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import * as path from "path";
import * as fs from "fs";
import { initializeDatabase, type LoopFlowDatabase } from "../db/database.js";

export interface ServerOptions {
  port: number;
  repoPath: string;
  staticDir?: string; // Path to built UI files (for production)
  managed?: boolean;  // If true, enable auto-shutdown (MCP mode)
  timeoutMs?: number; // Auto-shutdown timeout (default: 30 min)
}

export interface ManagedServer {
  url: string;
  port: number;
  stop: () => void;
}

// Singleton for MCP-managed server
let managedServerInstance: {
  server: ServerType;
  port: number;
  timeoutId: NodeJS.Timeout | null;
  db: LoopFlowDatabase;
} | null = null;

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function createApiServer(db: LoopFlowDatabase) {
  const app = new Hono();

  // CORS for development
  app.use("/api/*", cors());

  // API Routes

  // Stats endpoint for dashboard
  app.get("/api/stats", (c) => {
    const tasks = db.tasks.findAll();
    const insights = db.insights.findAll();
    const sessions = db.sessions.getRecent(5);

    const taskStats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === "TODO").length,
      in_progress: tasks.filter(t => t.status === "IN_PROGRESS").length,
      done: tasks.filter(t => t.status === "DONE").length,
      blocked: tasks.filter(t => t.status === "BLOCKED").length,
    };

    const insightsByType = insights.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return c.json({
      tasks: taskStats,
      insights: {
        total: insights.length,
        by_type: insightsByType,
      },
      sessions: {
        total: db.sessions.count(),
        recent: sessions.map(s => ({
          id: s.id,
          date: s.date,
          session_number: s.session_number,
          task_id: s.task_id,
          task_title: s.task_title,
          outcome: s.outcome,
          summary: s.summary.slice(0, 200) + (s.summary.length > 200 ? "..." : ""),
          created_at: s.created_at,
        })),
      },
    });
  });

  // Tasks
  app.get("/api/tasks", (c) => {
    const status = c.req.query("status");
    const priority = c.req.query("priority");
    
    const filters = {
      statuses: status ? [status] : undefined,
      priorities: priority ? [priority] : undefined,
    };
    
    const tasks = db.tasks.findAll(filters);
    return c.json(tasks.map(t => ({
      ...t,
      depends_on: t.depends_on ? JSON.parse(t.depends_on) : null,
      acceptance_criteria: t.acceptance_criteria ? JSON.parse(t.acceptance_criteria) : null,
    })));
  });

  app.get("/api/tasks/:id", (c) => {
    const task = db.tasks.findById(c.req.param("id"));
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }
    return c.json({
      ...task,
      depends_on: task.depends_on ? JSON.parse(task.depends_on) : null,
      acceptance_criteria: task.acceptance_criteria ? JSON.parse(task.acceptance_criteria) : null,
    });
  });

  app.patch("/api/tasks/:id", async (c) => {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Convert arrays back to JSON strings for storage
    if (updates.depends_on) {
      updates.depends_on = JSON.stringify(updates.depends_on);
    }
    if (updates.acceptance_criteria) {
      updates.acceptance_criteria = JSON.stringify(updates.acceptance_criteria);
    }
    
    const task = db.tasks.update(id, updates);
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }
    return c.json({
      ...task,
      depends_on: task.depends_on ? JSON.parse(task.depends_on) : null,
      acceptance_criteria: task.acceptance_criteria ? JSON.parse(task.acceptance_criteria) : null,
    });
  });

  // Insights
  app.get("/api/insights", (c) => {
    const type = c.req.query("type");
    
    const filters = {
      types: type ? [type] : undefined,
    };
    
    const insights = db.insights.findAll(filters);
    return c.json(insights.map(i => ({
      ...i,
      tags: i.tags ? JSON.parse(i.tags) : null,
      links: i.links ? JSON.parse(i.links) : null,
    })));
  });

  app.get("/api/insights/search", (c) => {
    const query = c.req.query("q") || "";
    if (!query) {
      return c.json([]);
    }
    
    const insights = db.insights.search(query);
    return c.json(insights.map(i => ({
      ...i,
      tags: i.tags ? JSON.parse(i.tags) : null,
      links: i.links ? JSON.parse(i.links) : null,
    })));
  });

  app.get("/api/insights/:id", (c) => {
    const insight = db.insights.findById(c.req.param("id"));
    if (!insight) {
      return c.json({ error: "Insight not found" }, 404);
    }
    return c.json({
      ...insight,
      tags: insight.tags ? JSON.parse(insight.tags) : null,
      links: insight.links ? JSON.parse(insight.links) : null,
    });
  });

  // Sessions
  app.get("/api/sessions", (c) => {
    const limitParam = c.req.query("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    
    const sessions = db.sessions.findAll(undefined, { limit });
    return c.json(sessions);
  });

  app.get("/api/sessions/:id", (c) => {
    const session = db.sessions.findById(c.req.param("id"));
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }
    return c.json(session);
  });

  return app;
}

/**
 * Start server in CLI mode (manual lifecycle)
 */
export async function startServer(options: ServerOptions): Promise<void> {
  const { port, repoPath, staticDir } = options;
  
  // Initialize database
  const db = initializeDatabase(repoPath);
  
  // Create API server
  const app = createApiServer(db);
  
  // Serve static files in production
  if (staticDir && fs.existsSync(staticDir)) {
    app.use("/*", serveStatic({ root: staticDir }));
    
    // SPA fallback - serve index.html for non-API routes
    app.get("*", (c) => {
      const indexPath = path.join(staticDir, "index.html");
      if (fs.existsSync(indexPath)) {
        return c.html(fs.readFileSync(indexPath, "utf-8"));
      }
      return c.notFound();
    });
  }
  
  console.log(`LoopFlow UI starting on http://localhost:${port}`);
  
  serve({
    fetch: app.fetch,
    port,
  });
}

/**
 * Start server in MCP mode (managed lifecycle)
 * - Returns handle to stop the server
 * - Auto-stops after timeout
 * - Singleton: reuses existing server if already running on same port
 */
export function startManagedServer(options: ServerOptions): ManagedServer {
  const { port, repoPath, staticDir, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  
  // If server already running on this port, reuse it (reset timeout)
  if (managedServerInstance && managedServerInstance.port === port) {
    // Reset timeout
    if (managedServerInstance.timeoutId) {
      clearTimeout(managedServerInstance.timeoutId);
    }
    managedServerInstance.timeoutId = setTimeout(() => {
      stopManagedServer();
    }, timeoutMs);
    
    return {
      url: `http://localhost:${port}`,
      port,
      stop: stopManagedServer,
    };
  }
  
  // Stop any existing server on different port
  if (managedServerInstance) {
    stopManagedServer();
  }
  
  // Initialize database
  const db = initializeDatabase(repoPath);
  
  // Create API server
  const app = createApiServer(db);
  
  // Serve static files
  if (staticDir && fs.existsSync(staticDir)) {
    app.use("/*", serveStatic({ root: staticDir }));
    
    app.get("*", (c) => {
      const indexPath = path.join(staticDir, "index.html");
      if (fs.existsSync(indexPath)) {
        return c.html(fs.readFileSync(indexPath, "utf-8"));
      }
      return c.notFound();
    });
  }
  
  // Start server
  const server = serve({
    fetch: app.fetch,
    port,
  });
  
  // Set up auto-shutdown timeout
  const timeoutId = setTimeout(() => {
    console.error(`[LoopFlow UI] Auto-shutdown after ${timeoutMs / 60000} minutes of inactivity`);
    stopManagedServer();
  }, timeoutMs);
  
  managedServerInstance = {
    server,
    port,
    timeoutId,
    db,
  };
  
  console.error(`[LoopFlow UI] Started on http://localhost:${port} (auto-shutdown in ${timeoutMs / 60000} min)`);
  
  return {
    url: `http://localhost:${port}`,
    port,
    stop: stopManagedServer,
  };
}

/**
 * Stop the managed server (called by loop_handoff or timeout)
 */
export function stopManagedServer(): void {
  if (!managedServerInstance) {
    return;
  }
  
  // Clear timeout
  if (managedServerInstance.timeoutId) {
    clearTimeout(managedServerInstance.timeoutId);
  }
  
  // Close server
  managedServerInstance.server.close();
  
  // Close database
  managedServerInstance.db.close();
  
  console.error("[LoopFlow UI] Server stopped");
  
  managedServerInstance = null;
}

/**
 * Check if managed server is running
 */
export function isManagedServerRunning(): boolean {
  return managedServerInstance !== null;
}
