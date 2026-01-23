/**
 * Integration tests for database operations (LF-081)
 * 
 * These tests verify the database operations that MCP tools rely on.
 * Pattern: Create a fresh temp database, perform operations, verify state.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { openDatabase } from "../schema.js";
import { createInsightsRepository } from "../repositories/insights.js";
import { createTasksRepository } from "../repositories/tasks.js";
import { createSessionsRepository } from "../repositories/sessions.js";
import { createRepoContextRepository } from "../repositories/repo-context.js";
import { createFeedbackSpecsRepository } from "../repositories/feedback-specs.js";

describe("Database Integration", () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    // Create temp directory for test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "loopflow-test-"));
    dbPath = path.join(tempDir, "test.db");
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe("InsightsRepository", () => {
    it("inserts and retrieves insight", () => {
      const db = openDatabase(dbPath);
      const insights = createInsightsRepository(db);

      insights.insert({
        id: "INS-001",
        content: "Test insight content",
        summary: "Test insight",
        type: "technical",
        status: "unprocessed",
        tags: JSON.stringify(["test"]),
        links: null,
        source: JSON.stringify({ task: "test" }),
        notes: null,
      });

      const retrieved = insights.findById("INS-001");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.content).toBe("Test insight content");
      expect(retrieved!.type).toBe("technical");

      db.close();
    });

    it("searches insights using FTS", () => {
      const db = openDatabase(dbPath);
      const insights = createInsightsRepository(db);

      insights.insert({
        id: "INS-001",
        content: "SQLite is a great database for local storage",
        summary: "SQLite for local storage",
        type: "technical",
        status: "unprocessed",
        tags: null,
        links: null,
        source: null,
        notes: null,
      });

      insights.insert({
        id: "INS-002",
        content: "React hooks simplify component logic",
        summary: "React hooks",
        type: "technical",
        status: "unprocessed",
        tags: null,
        links: null,
        source: null,
        notes: null,
      });

      const results = insights.search("SQLite", {}, { limit: 10 });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("INS-001");

      db.close();
    });

    it("generates next ID correctly", () => {
      const db = openDatabase(dbPath);
      const insights = createInsightsRepository(db);

      expect(insights.getNextId()).toBe("INS-001");

      insights.insert({
        id: "INS-001",
        content: "First",
        summary: "First",
        type: "technical",
        status: "unprocessed",
        tags: null,
        links: null,
        source: null,
        notes: null,
      });

      expect(insights.getNextId()).toBe("INS-002");

      db.close();
    });
  });

  describe("SessionsRepository", () => {
    it("inserts and retrieves session", () => {
      const db = openDatabase(dbPath);
      const sessions = createSessionsRepository(db);

      sessions.insert({
        id: "2026-01-22-S1",
        date: "2026-01-22",
        session_number: 1,
        task_id: "LF-080",
        task_type: "[BUG]",
        task_title: "Fix loop_handoff",
        outcome: "COMPLETE",
        summary: "Fixed the session recording bug",
        learnings: null,
        files_changed: JSON.stringify(["src/mcp/server.ts"]),
        insights_added: null,
      });

      const retrieved = sessions.findById("2026-01-22-S1");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.task_id).toBe("LF-080");
      expect(retrieved!.outcome).toBe("COMPLETE");

      db.close();
    });

    it("upserts session correctly", () => {
      const db = openDatabase(dbPath);
      const sessions = createSessionsRepository(db);

      // Insert
      sessions.upsert({
        id: "2026-01-22-S1",
        date: "2026-01-22",
        session_number: 1,
        task_id: "LF-080",
        task_type: null,
        task_title: null,
        outcome: "PARTIAL",
        summary: "Initial summary",
        learnings: null,
        files_changed: null,
        insights_added: null,
      });

      // Upsert (update)
      sessions.upsert({
        id: "2026-01-22-S1",
        date: "2026-01-22",
        session_number: 1,
        task_id: "LF-080",
        task_type: null,
        task_title: null,
        outcome: "COMPLETE",
        summary: "Updated summary",
        learnings: null,
        files_changed: null,
        insights_added: null,
      });

      const retrieved = sessions.findById("2026-01-22-S1");
      expect(retrieved!.outcome).toBe("COMPLETE");
      expect(retrieved!.summary).toBe("Updated summary");

      // Should still be only 1 session
      expect(sessions.count()).toBe(1);

      db.close();
    });

    it("gets recent sessions in correct order", () => {
      const db = openDatabase(dbPath);
      const sessions = createSessionsRepository(db);

      sessions.insert({
        id: "2026-01-20-S1",
        date: "2026-01-20",
        session_number: 1,
        task_id: null,
        task_type: null,
        task_title: null,
        outcome: "COMPLETE",
        summary: "Oldest",
        learnings: null,
        files_changed: null,
        insights_added: null,
      });

      sessions.insert({
        id: "2026-01-22-S1",
        date: "2026-01-22",
        session_number: 1,
        task_id: null,
        task_type: null,
        task_title: null,
        outcome: "COMPLETE",
        summary: "Newest",
        learnings: null,
        files_changed: null,
        insights_added: null,
      });

      const recent = sessions.getRecent(2);
      expect(recent[0].summary).toBe("Newest");
      expect(recent[1].summary).toBe("Oldest");

      db.close();
    });
  });

  describe("RepoContextRepository", () => {
    it("sets and gets repo context values", () => {
      const db = openDatabase(dbPath);
      const repoContext = createRepoContextRepository(db);

      repoContext.set("repo_summary", "This is a test repo", "session-1");
      repoContext.set("suggested_actions", "Fix bugs first", "session-1");

      expect(repoContext.getValue("repo_summary")).toBe("This is a test repo");
      expect(repoContext.getValue("suggested_actions")).toBe("Fix bugs first");

      db.close();
    });

    it("updates existing context value", () => {
      const db = openDatabase(dbPath);
      const repoContext = createRepoContextRepository(db);

      repoContext.set("suggested_actions", "Do task A", "session-1");
      repoContext.set("suggested_actions", "Do task B", "session-2");

      expect(repoContext.getValue("suggested_actions")).toBe("Do task B");

      // Check session tracking
      const record = repoContext.get("suggested_actions");
      expect(record!.updated_by_session).toBe("session-2");

      db.close();
    });

    it("gets full context object", () => {
      const db = openDatabase(dbPath);
      const repoContext = createRepoContextRepository(db);

      repoContext.set("repo_summary", "Test repo", "session-1");
      repoContext.set("folder_structure", "src/\n  mcp/", "session-1");
      repoContext.set("suggested_actions", "Continue work", "session-1");

      const full = repoContext.getFullContext();
      expect(full.repoSummary).toBe("Test repo");
      expect(full.folderStructure).toBe("src/\n  mcp/");
      expect(full.suggestedActions).toBe("Continue work");

      db.close();
    });

    it("returns null for missing context", () => {
      const db = openDatabase(dbPath);
      const repoContext = createRepoContextRepository(db);

      const full = repoContext.getFullContext();
      expect(full.repoSummary).toBeNull();
      expect(full.suggestedActions).toBeNull();

      db.close();
    });
  });

  describe("FeedbackSpecsRepository", () => {
    it("inserts and retrieves feedback spec", () => {
      const db = openDatabase(dbPath);
      const feedbackSpecs = createFeedbackSpecsRepository(db);

      feedbackSpecs.insert({
        id: "FB-001",
        type: "pain_point",
        title: "Loop orient takes too long",
        description: "When there are many insights, loop_orient is slow",
        context_summary: "Session with 100+ insights",
        severity: "medium",
        status: "queued",
        consent_given_at: new Date().toISOString(),
        shared_at: null,
        github_issue_url: null,
      });

      const retrieved = feedbackSpecs.findById("FB-001");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.title).toBe("Loop orient takes too long");
      expect(retrieved!.type).toBe("pain_point");
      expect(retrieved!.status).toBe("queued");

      db.close();
    });

    it("filters by status", () => {
      const db = openDatabase(dbPath);
      const feedbackSpecs = createFeedbackSpecsRepository(db);

      feedbackSpecs.insert({
        id: "FB-001",
        type: "pain_point",
        title: "Issue 1",
        description: "Desc 1",
        context_summary: null,
        severity: "medium",
        status: "queued",
        consent_given_at: new Date().toISOString(),
        shared_at: null,
        github_issue_url: null,
      });

      feedbackSpecs.insert({
        id: "FB-002",
        type: "feature_idea",
        title: "Issue 2",
        description: "Desc 2",
        context_summary: null,
        severity: "low",
        status: "shared",
        consent_given_at: new Date().toISOString(),
        shared_at: new Date().toISOString(),
        github_issue_url: "https://github.com/test/repo/issues/1",
      });

      const queued = feedbackSpecs.findAll({ statuses: ["queued"] });
      expect(queued.length).toBe(1);
      expect(queued[0].id).toBe("FB-001");

      const shared = feedbackSpecs.findAll({ statuses: ["shared"] });
      expect(shared.length).toBe(1);
      expect(shared[0].id).toBe("FB-002");

      db.close();
    });

    it("generates next ID correctly", () => {
      const db = openDatabase(dbPath);
      const feedbackSpecs = createFeedbackSpecsRepository(db);

      expect(feedbackSpecs.getNextId()).toBe("FB-001");

      feedbackSpecs.insert({
        id: "FB-001",
        type: "bug",
        title: "First bug",
        description: "Description",
        context_summary: null,
        severity: "high",
        status: "queued",
        consent_given_at: new Date().toISOString(),
        shared_at: null,
        github_issue_url: null,
      });

      expect(feedbackSpecs.getNextId()).toBe("FB-002");

      db.close();
    });

    it("updates status and shared info", () => {
      const db = openDatabase(dbPath);
      const feedbackSpecs = createFeedbackSpecsRepository(db);

      feedbackSpecs.insert({
        id: "FB-001",
        type: "pain_point",
        title: "Test issue",
        description: "Description",
        context_summary: null,
        severity: "medium",
        status: "queued",
        consent_given_at: new Date().toISOString(),
        shared_at: null,
        github_issue_url: null,
      });

      const sharedAt = new Date().toISOString();
      const issueUrl = "https://github.com/test/repo/issues/42";

      feedbackSpecs.update("FB-001", {
        status: "shared",
        shared_at: sharedAt,
        github_issue_url: issueUrl,
      });

      const updated = feedbackSpecs.findById("FB-001");
      expect(updated!.status).toBe("shared");
      expect(updated!.shared_at).toBe(sharedAt);
      expect(updated!.github_issue_url).toBe(issueUrl);

      db.close();
    });
  });

  describe("Cross-repository workflow", () => {
    it("simulates loop_handoff saving suggested_actions", () => {
      const db = openDatabase(dbPath);
      const sessions = createSessionsRepository(db);
      const repoContext = createRepoContextRepository(db);

      // Simulate loop_handoff
      const today = "2026-01-22";
      const sessionId = `${today}-S1`;
      const nextSessionShould = "Fix LF-079, LF-080, LF-081 before continuing";

      // Save suggested_actions (what loop_handoff does)
      repoContext.set("suggested_actions", nextSessionShould, sessionId);

      // Create session record (what loop_handoff now does after LF-080 fix)
      sessions.upsert({
        id: sessionId,
        date: today,
        session_number: 1,
        task_id: "LF-078",
        task_type: "[IMPL]",
        task_title: null,
        outcome: "COMPLETE",
        summary: "Completed: Skills cleanup",
        learnings: null,
        files_changed: null,
        insights_added: null,
      });

      // Verify (what loop_orient would see)
      const context = repoContext.getFullContext();
      expect(context.suggestedActions).toBe(nextSessionShould);

      const recentSessions = sessions.getRecent(1);
      expect(recentSessions[0].id).toBe(sessionId);
      expect(recentSessions[0].outcome).toBe("COMPLETE");

      db.close();
    });
  });
});
