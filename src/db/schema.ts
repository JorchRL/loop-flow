/**
 * LoopFlow SQLite Schema
 * 
 * Progressive disclosure schema with FTS5 for full-text search.
 * Designed for token-efficient retrieval.
 */

import Database from "better-sqlite3";

export const CURRENT_SCHEMA_VERSION = 2;

/**
 * SQL statements to create the database schema
 */
const SCHEMA_V1 = `
-- Core entities: insights
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,              -- INS-001, INS-002, etc.
  content TEXT NOT NULL,            -- Full insight content
  summary TEXT,                     -- Short summary for progressive disclosure
  type TEXT NOT NULL,               -- process|domain|architecture|edge_case|technical
  status TEXT NOT NULL DEFAULT 'unprocessed',  -- unprocessed|discussed
  tags TEXT,                        -- JSON array as text
  links TEXT,                       -- JSON array of insight IDs
  source TEXT,                      -- JSON object {task, session, original_id?}
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Core entities: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,              -- LF-001, LF-002, etc.
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT,                     -- Generated: [TYPE] + short title
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT DEFAULT 'medium',
  depends_on TEXT,                  -- JSON array of task IDs
  acceptance_criteria TEXT,         -- JSON array
  test_file TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL,
  description TEXT
);

-- Full-text search for insights
CREATE VIRTUAL TABLE IF NOT EXISTS insights_fts USING fts5(
  id,
  content, 
  summary,
  tags,
  content='insights',
  content_rowid='rowid'
);

-- Full-text search for tasks  
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  id,
  title,
  description,
  summary,
  content='tasks',
  content_rowid='rowid'
);

-- Triggers to keep insights FTS in sync
CREATE TRIGGER IF NOT EXISTS insights_ai AFTER INSERT ON insights BEGIN
  INSERT INTO insights_fts(rowid, id, content, summary, tags)
  VALUES (NEW.rowid, NEW.id, NEW.content, NEW.summary, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS insights_ad AFTER DELETE ON insights BEGIN
  INSERT INTO insights_fts(insights_fts, rowid, id, content, summary, tags)
  VALUES('delete', OLD.rowid, OLD.id, OLD.content, OLD.summary, OLD.tags);
END;

CREATE TRIGGER IF NOT EXISTS insights_au AFTER UPDATE ON insights BEGIN
  INSERT INTO insights_fts(insights_fts, rowid, id, content, summary, tags)
  VALUES('delete', OLD.rowid, OLD.id, OLD.content, OLD.summary, OLD.tags);
  INSERT INTO insights_fts(rowid, id, content, summary, tags)
  VALUES (NEW.rowid, NEW.id, NEW.content, NEW.summary, NEW.tags);
END;

-- Triggers to keep tasks FTS in sync
CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts(rowid, id, title, description, summary)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, id, title, description, summary)
  VALUES('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.summary);
END;

CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, id, title, description, summary)
  VALUES('delete', OLD.rowid, OLD.id, OLD.title, OLD.description, OLD.summary);
  INSERT INTO tasks_fts(rowid, id, title, description, summary)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.description, NEW.summary);
END;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_created ON insights(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
`;

/**
 * Schema V2 - Add sessions and repo_context tables
 */
const SCHEMA_V2 = `
-- Sessions table: stores progress.txt entries as structured data
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,              -- "2026-01-22-S21" format
  date TEXT NOT NULL,               -- "2026-01-22"
  session_number INTEGER NOT NULL,  -- 21
  task_id TEXT,                     -- LF-XXX if applicable
  task_type TEXT,                   -- [IMPL], [SPIKE], etc.
  task_title TEXT,
  outcome TEXT,                     -- COMPLETE, IN_PROGRESS, BLOCKED, etc.
  summary TEXT NOT NULL,            -- Main summary content
  learnings TEXT,                   -- Optional learnings section
  files_changed TEXT,               -- JSON array of files
  insights_added TEXT,              -- JSON array of insight IDs
  created_at TEXT NOT NULL
);

-- Repo context: agent-maintained state for session continuity
CREATE TABLE IF NOT EXISTS repo_context (
  key TEXT PRIMARY KEY,             -- 'repo_summary', 'suggested_actions', 'folder_structure'
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_session TEXT           -- Which session last touched it
);

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
`;

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  success: boolean;
  error?: string;
}

/**
 * Get current schema version from database
 */
export function getCurrentVersion(db: Database.Database): number {
  try {
    const result = db.prepare(
      "SELECT MAX(version) as version FROM schema_migrations"
    ).get() as { version: number | null } | undefined;
    return result?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Initialize or migrate the database schema
 */
export function migrateToLatest(db: Database.Database): MigrationResult {
  const fromVersion = getCurrentVersion(db);
  
  if (fromVersion >= CURRENT_SCHEMA_VERSION) {
    return { fromVersion, toVersion: fromVersion, success: true };
  }

  try {
    // Apply migrations incrementally
    if (fromVersion < 1) {
      db.exec(SCHEMA_V1);
      db.prepare(
        "INSERT OR REPLACE INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)"
      ).run(1, new Date().toISOString(), "Initial schema with FTS5");
    }

    if (fromVersion < 2) {
      db.exec(SCHEMA_V2);
      db.prepare(
        "INSERT OR REPLACE INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)"
      ).run(2, new Date().toISOString(), "Add sessions and repo_context tables");
    }

    return {
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      success: true,
    };
  } catch (error) {
    return {
      fromVersion,
      toVersion: fromVersion,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create or open database with schema initialization
 */
export function openDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma("foreign_keys = ON");
  
  // Migrate to latest
  const result = migrateToLatest(db);
  if (!result.success) {
    throw new Error(`Schema migration failed: ${result.error}`);
  }
  
  return db;
}
