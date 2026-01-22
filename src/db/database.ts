/**
 * Database Manager
 * 
 * Handles database lifecycle: initialization, migration from JSON files,
 * and provides access to repositories.
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { openDatabase } from "./schema.js";
import { createInsightsRepository, type InsightsRepository } from "./repositories/insights.js";
import { createTasksRepository, type TasksRepository } from "./repositories/tasks.js";
import { createSessionsRepository, type SessionsRepository } from "./repositories/sessions.js";
import { createRepoContextRepository, type RepoContextRepository } from "./repositories/repo-context.js";
import { 
  transformInsightsFile, 
  transformBacklogFile,
  type JsonInsightsFile,
  type JsonBacklog 
} from "../rules/migration.js";
import { parseProgressFile } from "../rules/progress-parser.js";

export interface LoopFlowDatabase {
  db: Database.Database;
  insights: InsightsRepository;
  tasks: TasksRepository;
  sessions: SessionsRepository;
  repoContext: RepoContextRepository;
  close: () => void;
}

export interface MigrationStats {
  insightsImported: number;
  tasksImported: number;
  skipped: number;
}

export interface ProgressImportStats {
  imported: number;
  skipped: number;
}

/**
 * Get database path for a repo.
 * Database is stored in .loop-flow/loopflow.db
 */
function getDatabasePath(repoPath: string): string {
  return path.join(repoPath, ".loop-flow", "loopflow.db");
}

/**
 * Check if JSON files exist (pre-migration state)
 */
function hasJsonFiles(repoPath: string): boolean {
  const insightsPath = path.join(repoPath, ".loop-flow", "plan", "insights.json");
  const backlogPath = path.join(repoPath, ".loop-flow", "plan", "backlog.json");
  return fs.existsSync(insightsPath) || fs.existsSync(backlogPath);
}

/**
 * Check if database exists and has data
 */
function hasDatabaseData(db: Database.Database): boolean {
  try {
    const result = db.prepare(
      "SELECT (SELECT COUNT(*) FROM insights) + (SELECT COUNT(*) FROM tasks) as total"
    ).get() as { total: number };
    return result.total > 0;
  } catch {
    return false;
  }
}

/**
 * Import JSON files into database (idempotent)
 */
function migrateFromJson(
  _db: Database.Database,
  repoPath: string,
  insights: InsightsRepository,
  tasks: TasksRepository
): MigrationStats {
  const stats: MigrationStats = { insightsImported: 0, tasksImported: 0, skipped: 0 };

  // Import insights
  const insightsPath = path.join(repoPath, ".loop-flow", "plan", "insights.json");
  if (fs.existsSync(insightsPath)) {
    try {
      const content = fs.readFileSync(insightsPath, "utf-8");
      const file = JSON.parse(content) as JsonInsightsFile;
      const records = transformInsightsFile(file);

      for (const record of records) {
        // Skip if already exists (idempotent)
        if (insights.findById(record.id)) {
          stats.skipped++;
          continue;
        }
        insights.insert(record);
        stats.insightsImported++;
      }
    } catch (e) {
      console.error("Error importing insights:", e);
    }
  }

  // Import tasks
  const backlogPath = path.join(repoPath, ".loop-flow", "plan", "backlog.json");
  if (fs.existsSync(backlogPath)) {
    try {
      const content = fs.readFileSync(backlogPath, "utf-8");
      const file = JSON.parse(content) as JsonBacklog;
      const records = transformBacklogFile(file);

      for (const record of records) {
        // Skip if already exists (idempotent)
        if (tasks.findById(record.id)) {
          stats.skipped++;
          continue;
        }
        tasks.insert(record);
        stats.tasksImported++;
      }
    } catch (e) {
      console.error("Error importing tasks:", e);
    }
  }

  return stats;
}

/**
 * Initialize database for a repository.
 * - Creates SQLite database if not exists
 * - Migrates from JSON files if database is empty
 * - Returns repositories
 */
export function initializeDatabase(repoPath: string): LoopFlowDatabase {
  const dbPath = getDatabasePath(repoPath);
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Open and migrate schema
  const db = openDatabase(dbPath);
  
  // Create repositories
  const insights = createInsightsRepository(db);
  const tasks = createTasksRepository(db);
  const sessions = createSessionsRepository(db);
  const repoContext = createRepoContextRepository(db);

  // Auto-migrate from JSON if database is empty and JSON files exist
  if (!hasDatabaseData(db) && hasJsonFiles(repoPath)) {
    const stats = migrateFromJson(db, repoPath, insights, tasks);
    console.error(
      `[LoopFlow] Migrated from JSON: ${stats.insightsImported} insights, ${stats.tasksImported} tasks`
    );
  }

  // Auto-import progress.txt if sessions table is empty
  const progressPath = path.join(repoPath, ".loop-flow", "plan", "progress.txt");
  if (sessions.count() === 0 && fs.existsSync(progressPath)) {
    const progressStats = importProgressFromFile(progressPath, sessions);
    if (progressStats.imported > 0) {
      console.error(
        `[LoopFlow] Imported progress.txt: ${progressStats.imported} sessions`
      );
    }
  }

  return {
    db,
    insights,
    tasks,
    sessions,
    repoContext,
    close: () => db.close(),
  };
}

/**
 * Force re-import from JSON files (one-time migration)
 */
export function importFromJson(database: LoopFlowDatabase, repoPath: string): MigrationStats {
  return migrateFromJson(database.db, repoPath, database.insights, database.tasks);
}

/**
 * Import progress.txt into sessions table
 */
function importProgressFromFile(
  progressPath: string,
  sessions: SessionsRepository
): ProgressImportStats {
  const stats: ProgressImportStats = { imported: 0, skipped: 0 };
  
  try {
    const content = fs.readFileSync(progressPath, "utf-8");
    const parsed = parseProgressFile(content);
    
    for (const session of parsed) {
      // Check if already exists
      if (sessions.findById(session.id)) {
        stats.skipped++;
        continue;
      }
      
      sessions.insert({
        id: session.id,
        date: session.date,
        session_number: session.sessionNumber,
        task_id: session.taskId,
        task_type: session.taskType,
        task_title: session.taskTitle,
        outcome: session.outcome,
        summary: session.summary,
        learnings: session.learnings,
        files_changed: session.filesChanged ? JSON.stringify(session.filesChanged) : null,
        insights_added: session.insightsAdded ? JSON.stringify(session.insightsAdded) : null,
      });
      stats.imported++;
    }
  } catch (e) {
    console.error("Error importing progress.txt:", e);
  }
  
  return stats;
}

/**
 * Force re-import progress.txt (exposed for loop_import tool)
 */
export function importProgress(database: LoopFlowDatabase, repoPath: string): ProgressImportStats {
  const progressPath = path.join(repoPath, ".loop-flow", "plan", "progress.txt");
  if (!fs.existsSync(progressPath)) {
    return { imported: 0, skipped: 0 };
  }
  return importProgressFromFile(progressPath, database.sessions);
}
