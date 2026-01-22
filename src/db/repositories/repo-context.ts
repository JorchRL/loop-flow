/**
 * Repo Context Repository
 * 
 * Key-value store for agent-maintained repo state:
 * - repo_summary: Agent's description + folder structure
 * - suggested_actions: What next session should do
 */

import Database from "better-sqlite3";

export interface RepoContextRecord {
  key: string;
  value: string;
  updated_at: string;
  updated_by_session: string | null;
}

// Known context keys
export type ContextKey = 
  | "repo_summary"       // Agent's high-level description
  | "folder_structure"   // Agent's annotated folder tree
  | "suggested_actions"; // Free-form notes for next session

export function createRepoContextRepository(db: Database.Database) {
  return {
    get(key: ContextKey): RepoContextRecord | null {
      return db.prepare("SELECT * FROM repo_context WHERE key = ?").get(key) as RepoContextRecord | null;
    },

    getValue(key: ContextKey): string | null {
      const record = this.get(key);
      return record?.value || null;
    },

    getAll(): RepoContextRecord[] {
      return db.prepare("SELECT * FROM repo_context").all() as RepoContextRecord[];
    },

    set(key: ContextKey, value: string, sessionId?: string): RepoContextRecord {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO repo_context (key, value, updated_at, updated_by_session)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at,
          updated_by_session = excluded.updated_by_session
      `).run(key, value, now, sessionId || null);
      return this.get(key)!;
    },

    /**
     * Get the full repo context as a structured object
     */
    getFullContext(): {
      repoSummary: string | null;
      folderStructure: string | null;
      suggestedActions: string | null;
      lastUpdated: string | null;
      lastUpdatedBySession: string | null;
    } {
      const records = this.getAll();
      const byKey = new Map(records.map(r => [r.key, r]));
      
      const summary = byKey.get("repo_summary");
      const structure = byKey.get("folder_structure");
      const actions = byKey.get("suggested_actions");
      
      // Find most recent update
      const allUpdates = records.map(r => r.updated_at).filter(Boolean);
      const lastUpdated = allUpdates.length > 0 
        ? allUpdates.sort().reverse()[0] 
        : null;
      
      // Find which session last updated
      const recentRecord = records.find(r => r.updated_at === lastUpdated);
      
      return {
        repoSummary: summary?.value || null,
        folderStructure: structure?.value || null,
        suggestedActions: actions?.value || null,
        lastUpdated,
        lastUpdatedBySession: recentRecord?.updated_by_session || null,
      };
    },

    /**
     * Update multiple context values at once
     */
    setMultiple(
      updates: Partial<Record<ContextKey, string>>,
      sessionId?: string
    ): void {
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          this.set(key as ContextKey, value, sessionId);
        }
      }
    },
  };
}

export type RepoContextRepository = ReturnType<typeof createRepoContextRepository>;
