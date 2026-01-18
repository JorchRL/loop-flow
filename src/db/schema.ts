/**
 * Loop-Flow SQLite Schema
 *
 * This file contains the schema definitions and migration logic.
 * Using better-sqlite3 for synchronous operations.
 */

// TODO: Implement in LF-003

export const SCHEMA_VERSION = 1;

/**
 * SQL statements to create the database schema
 */
export const CREATE_TABLES = `
-- Metadata table for schema versioning
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  agents_md_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_session_at TEXT
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT NOT NULL DEFAULT 'medium',
  depends_on TEXT, -- JSON array of task IDs
  acceptance_criteria TEXT, -- JSON array of strings
  notes TEXT,
  test_file TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  PRIMARY KEY (id, repo_id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  task_id TEXT,
  session_number INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  outcome TEXT,
  notes TEXT,
  needs_qa INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

-- Learnings table
CREATE TABLE IF NOT EXISTS learnings (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  session_id TEXT,
  task_id TEXT,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT, -- JSON array of strings
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (repo_id) REFERENCES repos(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_repo_status ON tasks(repo_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_repo_priority ON tasks(repo_id, priority);
CREATE INDEX IF NOT EXISTS idx_sessions_repo ON sessions(repo_id);
CREATE INDEX IF NOT EXISTS idx_learnings_repo ON learnings(repo_id);
CREATE INDEX IF NOT EXISTS idx_learnings_type ON learnings(type);

-- Full-text search for learnings
CREATE VIRTUAL TABLE IF NOT EXISTS learnings_fts USING fts5(
  content,
  tags,
  content='learnings',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS learnings_ai AFTER INSERT ON learnings BEGIN
  INSERT INTO learnings_fts(rowid, content, tags)
  VALUES (NEW.rowid, NEW.content, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS learnings_ad AFTER DELETE ON learnings BEGIN
  INSERT INTO learnings_fts(learnings_fts, rowid, content, tags)
  VALUES('delete', OLD.rowid, OLD.content, OLD.tags);
END;

CREATE TRIGGER IF NOT EXISTS learnings_au AFTER UPDATE ON learnings BEGIN
  INSERT INTO learnings_fts(learnings_fts, rowid, content, tags)
  VALUES('delete', OLD.rowid, OLD.content, OLD.tags);
  INSERT INTO learnings_fts(rowid, content, tags)
  VALUES (NEW.rowid, NEW.content, NEW.tags);
END;
`;

/**
 * Initialize or migrate the database
 */
export function initializeSchema(_db: unknown): void {
  // TODO: Implement in LF-003
  console.log("Schema initialization not yet implemented");
}
