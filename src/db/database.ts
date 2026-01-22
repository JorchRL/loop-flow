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
import { 
  transformInsightsFile, 
  transformBacklogFile,
  type JsonInsightsFile,
  type JsonBacklog 
} from "../rules/migration.js";

export interface LoopFlowDatabase {
  db: Database.Database;
  insights: InsightsRepository;
  tasks: TasksRepository;
  close: () => void;
}

export interface MigrationStats {
  insightsImported: number;
  tasksImported: number;
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

  // Auto-migrate from JSON if database is empty and JSON files exist
  if (!hasDatabaseData(db) && hasJsonFiles(repoPath)) {
    const stats = migrateFromJson(db, repoPath, insights, tasks);
    console.error(
      `[LoopFlow] Migrated from JSON: ${stats.insightsImported} insights, ${stats.tasksImported} tasks`
    );
  }

  return {
    db,
    insights,
    tasks,
    close: () => db.close(),
  };
}

/**
 * Force re-import from JSON files (one-time migration)
 */
export function importFromJson(database: LoopFlowDatabase, repoPath: string): MigrationStats {
  return migrateFromJson(database.db, repoPath, database.insights, database.tasks);
}
