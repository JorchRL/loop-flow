/**
 * Sessions Repository
 * 
 * Data access for sessions table (parsed from progress.txt).
 */

import Database from "better-sqlite3";

export interface SessionRecord {
  id: string;                 // "2026-01-22-S21"
  date: string;               // "2026-01-22"
  session_number: number;     // 21
  task_id: string | null;     // LF-XXX
  task_type: string | null;   // [IMPL], [SPIKE], etc.
  task_title: string | null;
  outcome: string | null;     // COMPLETE, IN_PROGRESS, BLOCKED
  summary: string;            // Main summary content
  learnings: string | null;
  files_changed: string | null;  // JSON array
  insights_added: string | null; // JSON array
  created_at: string;
}

export interface SessionFilters {
  taskIds?: string[];
  outcomes?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export function createSessionsRepository(db: Database.Database) {
  return {
    findById(id: string): SessionRecord | null {
      return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRecord | null;
    },

    findAll(filters?: SessionFilters, pagination?: PaginationParams): SessionRecord[] {
      let sql = "SELECT * FROM sessions WHERE 1=1";
      const params: unknown[] = [];

      if (filters?.taskIds?.length) {
        const placeholders = filters.taskIds.map(() => "?").join(",");
        sql += ` AND task_id IN (${placeholders})`;
        params.push(...filters.taskIds);
      }

      if (filters?.outcomes?.length) {
        const placeholders = filters.outcomes.map(() => "?").join(",");
        sql += ` AND outcome IN (${placeholders})`;
        params.push(...filters.outcomes);
      }

      if (filters?.dateFrom) {
        sql += " AND date >= ?";
        params.push(filters.dateFrom);
      }

      if (filters?.dateTo) {
        sql += " AND date <= ?";
        params.push(filters.dateTo);
      }

      sql += " ORDER BY date DESC, session_number DESC";

      if (pagination?.limit) {
        sql += " LIMIT ?";
        params.push(pagination.limit);
      }

      if (pagination?.offset) {
        sql += " OFFSET ?";
        params.push(pagination.offset);
      }

      return db.prepare(sql).all(...params) as SessionRecord[];
    },

    /**
     * Get N most recent sessions
     */
    getRecent(n: number): SessionRecord[] {
      return db.prepare(
        "SELECT * FROM sessions ORDER BY date DESC, session_number DESC LIMIT ?"
      ).all(n) as SessionRecord[];
    },

    insert(session: Omit<SessionRecord, "created_at">): SessionRecord {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO sessions (
          id, date, session_number, task_id, task_type, task_title,
          outcome, summary, learnings, files_changed, insights_added, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id,
        session.date,
        session.session_number,
        session.task_id,
        session.task_type,
        session.task_title,
        session.outcome,
        session.summary,
        session.learnings,
        session.files_changed,
        session.insights_added,
        now
      );
      return this.findById(session.id)!;
    },

    upsert(session: Omit<SessionRecord, "created_at">): SessionRecord {
      const existing = this.findById(session.id);
      if (existing) {
        // Update existing
        db.prepare(`
          UPDATE sessions SET
            date = ?, session_number = ?, task_id = ?, task_type = ?,
            task_title = ?, outcome = ?, summary = ?, learnings = ?,
            files_changed = ?, insights_added = ?
          WHERE id = ?
        `).run(
          session.date,
          session.session_number,
          session.task_id,
          session.task_type,
          session.task_title,
          session.outcome,
          session.summary,
          session.learnings,
          session.files_changed,
          session.insights_added,
          session.id
        );
        return this.findById(session.id)!;
      }
      return this.insert(session);
    },

    count(): number {
      const result = db.prepare("SELECT COUNT(*) as count FROM sessions").get() as { count: number };
      return result.count;
    },

    getLastSessionId(): string | null {
      const result = db.prepare(
        "SELECT id FROM sessions ORDER BY date DESC, session_number DESC LIMIT 1"
      ).get() as { id: string } | undefined;
      return result?.id || null;
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
