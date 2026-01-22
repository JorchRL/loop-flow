/**
 * Insights Repository
 * 
 * Data access for insights table with FTS5 search.
 */

import Database from "better-sqlite3";

export interface InsightRecord {
  id: string;
  content: string;
  summary: string | null;
  type: string;
  status: string;
  tags: string | null;      // JSON array as string
  links: string | null;     // JSON array as string
  source: string | null;    // JSON object as string
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsightFilters {
  types?: string[];
  statuses?: string[];
  tags?: string[];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export function createInsightsRepository(db: Database.Database) {
  return {
    findById(id: string): InsightRecord | null {
      return db.prepare("SELECT * FROM insights WHERE id = ?").get(id) as InsightRecord | null;
    },

    findByIds(ids: string[]): InsightRecord[] {
      if (ids.length === 0) return [];
      const placeholders = ids.map(() => "?").join(",");
      return db.prepare(`SELECT * FROM insights WHERE id IN (${placeholders})`).all(...ids) as InsightRecord[];
    },

    findAll(filters?: InsightFilters, pagination?: PaginationParams): InsightRecord[] {
      let sql = "SELECT * FROM insights WHERE 1=1";
      const params: unknown[] = [];

      if (filters?.types?.length) {
        const placeholders = filters.types.map(() => "?").join(",");
        sql += ` AND type IN (${placeholders})`;
        params.push(...filters.types);
      }

      if (filters?.statuses?.length) {
        const placeholders = filters.statuses.map(() => "?").join(",");
        sql += ` AND status IN (${placeholders})`;
        params.push(...filters.statuses);
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

      return db.prepare(sql).all(...params) as InsightRecord[];
    },

    /**
     * Full-text search using FTS5
     */
    search(query: string, filters?: InsightFilters, pagination?: PaginationParams): InsightRecord[] {
      // FTS5 query - escape special characters and use prefix matching
      const ftsQuery = query
        .split(/\s+/)
        .filter(Boolean)
        .map(term => `"${term.replace(/"/g, '""')}"*`)
        .join(" OR ");

      if (!ftsQuery) return [];

      let sql = `
        SELECT i.*, bm25(insights_fts) as rank
        FROM insights i
        JOIN insights_fts fts ON i.rowid = fts.rowid
        WHERE insights_fts MATCH ?
      `;
      const params: unknown[] = [ftsQuery];

      if (filters?.types?.length) {
        const placeholders = filters.types.map(() => "?").join(",");
        sql += ` AND i.type IN (${placeholders})`;
        params.push(...filters.types);
      }

      if (filters?.statuses?.length) {
        const placeholders = filters.statuses.map(() => "?").join(",");
        sql += ` AND i.status IN (${placeholders})`;
        params.push(...filters.statuses);
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

      return db.prepare(sql).all(...params) as InsightRecord[];
    },

    insert(insight: Omit<InsightRecord, "created_at" | "updated_at">): InsightRecord {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO insights (id, content, summary, type, status, tags, links, source, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        insight.id,
        insight.content,
        insight.summary,
        insight.type,
        insight.status,
        insight.tags,
        insight.links,
        insight.source,
        insight.notes,
        now,
        now
      );
      return this.findById(insight.id)!;
    },

    update(id: string, changes: Partial<InsightRecord>): InsightRecord | null {
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

      db.prepare(`UPDATE insights SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      return this.findById(id);
    },

    count(filters?: InsightFilters): number {
      let sql = "SELECT COUNT(*) as count FROM insights WHERE 1=1";
      const params: unknown[] = [];

      if (filters?.types?.length) {
        const placeholders = filters.types.map(() => "?").join(",");
        sql += ` AND type IN (${placeholders})`;
        params.push(...filters.types);
      }

      if (filters?.statuses?.length) {
        const placeholders = filters.statuses.map(() => "?").join(",");
        sql += ` AND status IN (${placeholders})`;
        params.push(...filters.statuses);
      }

      const result = db.prepare(sql).get(...params) as { count: number };
      return result.count;
    },

    getNextId(): string {
      const result = db.prepare(
        "SELECT id FROM insights ORDER BY CAST(SUBSTR(id, 5) AS INTEGER) DESC LIMIT 1"
      ).get() as { id: string } | undefined;
      
      if (!result) return "INS-001";
      
      const num = parseInt(result.id.replace("INS-", ""), 10);
      return `INS-${String(num + 1).padStart(3, "0")}`;
    },
  };
}

export type InsightsRepository = ReturnType<typeof createInsightsRepository>;
