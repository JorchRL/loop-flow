/**
 * Tasks Repository
 * 
 * Data access for tasks table with FTS5 search.
 */

import Database from "better-sqlite3";

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  status: string;
  priority: string;
  depends_on: string | null;        // JSON array as string
  acceptance_criteria: string | null; // JSON array as string
  test_file: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  statuses?: string[];
  priorities?: string[];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export function createTasksRepository(db: Database.Database) {
  return {
    findById(id: string): TaskRecord | null {
      return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRecord | null;
    },

    findByIds(ids: string[]): TaskRecord[] {
      if (ids.length === 0) return [];
      const placeholders = ids.map(() => "?").join(",");
      return db.prepare(`SELECT * FROM tasks WHERE id IN (${placeholders})`).all(...ids) as TaskRecord[];
    },

    findAll(filters?: TaskFilters, pagination?: PaginationParams): TaskRecord[] {
      let sql = "SELECT * FROM tasks WHERE 1=1";
      const params: unknown[] = [];

      if (filters?.statuses?.length) {
        const placeholders = filters.statuses.map(() => "?").join(",");
        sql += ` AND status IN (${placeholders})`;
        params.push(...filters.statuses);
      }

      if (filters?.priorities?.length) {
        const placeholders = filters.priorities.map(() => "?").join(",");
        sql += ` AND priority IN (${placeholders})`;
        params.push(...filters.priorities);
      }

      sql += " ORDER BY created_at DESC";

      if (pagination?.limit) {
        sql += " LIMIT ?";
        params.push(pagination.limit);
      }

      if (pagination?.offset) {
        sql += " OFFSET ?";
        params.push(pagination.offset);
      }

      return db.prepare(sql).all(...params) as TaskRecord[];
    },

    /**
     * Full-text search using FTS5
     */
    search(query: string, filters?: TaskFilters, pagination?: PaginationParams): TaskRecord[] {
      const ftsQuery = query
        .split(/\s+/)
        .filter(Boolean)
        .map(term => `"${term.replace(/"/g, '""')}"*`)
        .join(" OR ");

      if (!ftsQuery) return [];

      let sql = `
        SELECT t.*, bm25(tasks_fts) as rank
        FROM tasks t
        JOIN tasks_fts fts ON t.rowid = fts.rowid
        WHERE tasks_fts MATCH ?
      `;
      const params: unknown[] = [ftsQuery];

      if (filters?.statuses?.length) {
        const placeholders = filters.statuses.map(() => "?").join(",");
        sql += ` AND t.status IN (${placeholders})`;
        params.push(...filters.statuses);
      }

      if (filters?.priorities?.length) {
        const placeholders = filters.priorities.map(() => "?").join(",");
        sql += ` AND t.priority IN (${placeholders})`;
        params.push(...filters.priorities);
      }

      sql += " ORDER BY rank";

      if (pagination?.limit) {
        sql += " LIMIT ?";
        params.push(pagination.limit);
      }

      if (pagination?.offset) {
        sql += " OFFSET ?";
        params.push(pagination.offset);
      }

      return db.prepare(sql).all(...params) as TaskRecord[];
    },

    insert(task: Omit<TaskRecord, "created_at" | "updated_at">): TaskRecord {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO tasks (id, title, description, summary, status, priority, depends_on, acceptance_criteria, test_file, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        task.id,
        task.title,
        task.description,
        task.summary,
        task.status,
        task.priority,
        task.depends_on,
        task.acceptance_criteria,
        task.test_file,
        task.notes,
        now,
        now
      );
      return this.findById(task.id)!;
    },

    update(id: string, changes: Partial<TaskRecord>): TaskRecord | null {
      const existing = this.findById(id);
      if (!existing) return null;

      const updates: string[] = [];
      const params: unknown[] = [];

      for (const [key, value] of Object.entries(changes)) {
        if (key !== "id" && key !== "created_at") {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }

      updates.push("updated_at = ?");
      params.push(new Date().toISOString());
      params.push(id);

      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      return this.findById(id);
    },

    count(filters?: TaskFilters): number {
      let sql = "SELECT COUNT(*) as count FROM tasks WHERE 1=1";
      const params: unknown[] = [];

      if (filters?.statuses?.length) {
        const placeholders = filters.statuses.map(() => "?").join(",");
        sql += ` AND status IN (${placeholders})`;
        params.push(...filters.statuses);
      }

      if (filters?.priorities?.length) {
        const placeholders = filters.priorities.map(() => "?").join(",");
        sql += ` AND priority IN (${placeholders})`;
        params.push(...filters.priorities);
      }

      const result = db.prepare(sql).get(...params) as { count: number };
      return result.count;
    },
  };
}

export type TasksRepository = ReturnType<typeof createTasksRepository>;
