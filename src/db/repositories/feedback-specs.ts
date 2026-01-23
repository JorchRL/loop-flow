/**
 * Feedback Specs Repository
 * 
 * Data access for feedback_specs table - captures pain points, feature ideas, and bugs.
 */

import Database from "better-sqlite3";

export interface FeedbackSpecRecord {
  id: string;
  type: "pain_point" | "feature_idea" | "bug";
  title: string;
  description: string;
  context_summary: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "queued" | "shared" | "dismissed";
  consent_given_at: string;
  shared_at: string | null;
  github_issue_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSpecFilters {
  types?: Array<"pain_point" | "feature_idea" | "bug">;
  statuses?: Array<"queued" | "shared" | "dismissed">;
  severities?: Array<"low" | "medium" | "high" | "critical">;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export function createFeedbackSpecsRepository(db: Database.Database) {
  return {
    findById(id: string): FeedbackSpecRecord | null {
      return db.prepare("SELECT * FROM feedback_specs WHERE id = ?").get(id) as FeedbackSpecRecord | null;
    },

    findAll(filters?: FeedbackSpecFilters, pagination?: PaginationParams): FeedbackSpecRecord[] {
      let sql = "SELECT * FROM feedback_specs WHERE 1=1";
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

      if (filters?.severities?.length) {
        const placeholders = filters.severities.map(() => "?").join(",");
        sql += ` AND severity IN (${placeholders})`;
        params.push(...filters.severities);
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

      return db.prepare(sql).all(...params) as FeedbackSpecRecord[];
    },

    insert(spec: Omit<FeedbackSpecRecord, "created_at" | "updated_at">): FeedbackSpecRecord {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO feedback_specs (
          id, type, title, description, context_summary, severity, status,
          consent_given_at, shared_at, github_issue_url, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        spec.id,
        spec.type,
        spec.title,
        spec.description,
        spec.context_summary,
        spec.severity,
        spec.status,
        spec.consent_given_at,
        spec.shared_at,
        spec.github_issue_url,
        now,
        now
      );
      return this.findById(spec.id)!;
    },

    update(id: string, changes: Partial<FeedbackSpecRecord>): FeedbackSpecRecord | null {
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

      db.prepare(`UPDATE feedback_specs SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      return this.findById(id);
    },

    count(filters?: FeedbackSpecFilters): number {
      let sql = "SELECT COUNT(*) as count FROM feedback_specs WHERE 1=1";
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
        "SELECT id FROM feedback_specs ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) DESC LIMIT 1"
      ).get() as { id: string } | undefined;
      
      if (!result) return "FB-001";
      
      const num = parseInt(result.id.replace("FB-", ""), 10);
      return `FB-${String(num + 1).padStart(3, "0")}`;
    },

    delete(id: string): boolean {
      const result = db.prepare("DELETE FROM feedback_specs WHERE id = ?").run(id);
      return result.changes > 0;
    },
  };
}

export type FeedbackSpecsRepository = ReturnType<typeof createFeedbackSpecsRepository>;
