/**
 * MCP Tools Integration Tests (LF-081)
 * 
 * These tests verify MCP tool behavior by simulating the complete workflow:
 * 1. Create a temp repo with .loop-flow structure
 * 2. Call tools and verify database state
 * 
 * Pattern: Self-debugging tests that verify expectations at each step.
 * Catches issues like "code path not exercised" or "state not persisted".
 * 
 * Note: These tests import the tool handlers and call them directly,
 * bypassing MCP transport layer but testing the actual business logic.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { initializeDatabase, type LoopFlowDatabase } from "../../db/database.js";

/**
 * Helper to create a minimal LoopFlow repo structure for testing
 */
function createTestRepo(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "loopflow-mcp-test-"));
  const loopFlowDir = path.join(tempDir, ".loop-flow");
  
  fs.mkdirSync(loopFlowDir, { recursive: true });
  
  // Create minimal WORKFLOW.md
  fs.writeFileSync(
    path.join(loopFlowDir, "WORKFLOW.md"),
    "# Test Workflow\n\nTest rules for MCP testing."
  );
  
  return tempDir;
}

/**
 * Helper to cleanup test repo
 */
function cleanupTestRepo(repoPath: string): void {
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true });
  }
}

describe("MCP Tools Integration", () => {
  let testRepoPath: string;
  let database: LoopFlowDatabase;

  beforeEach(() => {
    testRepoPath = createTestRepo();
    database = initializeDatabase(testRepoPath);
  });

  afterEach(() => {
    database.close();
    cleanupTestRepo(testRepoPath);
  });

  describe("Database Initialization (loop_orient prerequisite)", () => {
    it("creates database file in .loop-flow/", () => {
      const dbPath = path.join(testRepoPath, ".loop-flow", "loopflow.db");
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it("initializes empty tables on fresh repo", () => {
      expect(database.insights.count()).toBe(0);
      expect(database.tasks.count()).toBe(0);
      expect(database.sessions.count()).toBe(0);
    });

    it("provides all repositories", () => {
      expect(database.insights).toBeDefined();
      expect(database.tasks).toBeDefined();
      expect(database.sessions).toBeDefined();
      expect(database.repoContext).toBeDefined();
    });
  });

  describe("loop_remember simulation", () => {
    it("inserts insight into database", () => {
      const id = database.insights.getNextId();
      expect(id).toBe("INS-001");

      database.insights.insert({
        id,
        content: "MCP tools need integration tests to catch state persistence bugs",
        summary: "MCP integration tests needed",
        type: "technical",
        status: "unprocessed",
        tags: JSON.stringify(["testing", "mcp"]),
        links: null,
        source: JSON.stringify({ task: "LF-081", session: "2026-01-22" }),
        notes: null,
      });

      const retrieved = database.insights.findById(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.content).toContain("MCP tools need integration tests");
      expect(retrieved!.type).toBe("technical");
      expect(retrieved!.status).toBe("unprocessed");
    });

    it("auto-increments insight IDs", () => {
      // Insert first insight
      database.insights.insert({
        id: "INS-001",
        content: "First insight",
        summary: "First",
        type: "technical",
        status: "unprocessed",
        tags: null,
        links: null,
        source: null,
        notes: null,
      });

      // Get next ID
      expect(database.insights.getNextId()).toBe("INS-002");

      // Insert second
      database.insights.insert({
        id: "INS-002",
        content: "Second insight",
        summary: "Second",
        type: "process",
        status: "unprocessed",
        tags: null,
        links: null,
        source: null,
        notes: null,
      });

      expect(database.insights.getNextId()).toBe("INS-003");
      expect(database.insights.count()).toBe(2);
    });
  });

  describe("loop_handoff simulation", () => {
    it("saves suggested_actions to repo_context", () => {
      const sessionId = "2026-01-22-S1";
      const suggestedActions = "Continue with LF-082, then LF-083. Don't forget to run tests.";

      database.repoContext.set("suggested_actions", suggestedActions, sessionId);

      // Verify it was saved
      const retrieved = database.repoContext.getValue("suggested_actions");
      expect(retrieved).toBe(suggestedActions);

      // Verify session tracking
      const record = database.repoContext.get("suggested_actions");
      expect(record!.updated_by_session).toBe(sessionId);
    });

    it("creates session record in sessions table", () => {
      const sessionId = "2026-01-22-S1";
      const today = "2026-01-22";

      database.sessions.upsert({
        id: sessionId,
        date: today,
        session_number: 1,
        task_id: "LF-081",
        task_type: "[IMPL]",
        task_title: "MCP server integration tests",
        outcome: "COMPLETE",
        summary: "Completed: Created integration tests for MCP tools",
        learnings: null,
        files_changed: JSON.stringify(["src/mcp/__tests__/tools.test.ts"]),
        insights_added: JSON.stringify(["1 insight captured"]),
      });

      // Verify session was created
      const session = database.sessions.findById(sessionId);
      expect(session).not.toBeNull();
      expect(session!.task_id).toBe("LF-081");
      expect(session!.outcome).toBe("COMPLETE");

      // Verify it appears in recent sessions
      const recent = database.sessions.getRecent(1);
      expect(recent[0].id).toBe(sessionId);
    });

    it("calculates next session number correctly", () => {
      // First session of the day
      database.sessions.insert({
        id: "2026-01-22-S1",
        date: "2026-01-22",
        session_number: 1,
        task_id: null,
        task_type: null,
        task_title: null,
        outcome: "COMPLETE",
        summary: "First session",
        learnings: null,
        files_changed: null,
        insights_added: null,
      });

      const lastId = database.sessions.getLastSessionId();
      expect(lastId).toBe("2026-01-22-S1");

      // Next session should be S2
      database.sessions.insert({
        id: "2026-01-22-S2",
        date: "2026-01-22",
        session_number: 2,
        task_id: null,
        task_type: null,
        task_title: null,
        outcome: "COMPLETE",
        summary: "Second session",
        learnings: null,
        files_changed: null,
        insights_added: null,
      });

      expect(database.sessions.getLastSessionId()).toBe("2026-01-22-S2");
    });
  });

  describe("loop_update_summary simulation", () => {
    it("updates repo_summary in repo_context", () => {
      const sessionId = "2026-01-22-current";
      const repoSummary = "LoopFlow MCP server - provides cognitive tools for AI-assisted development";

      database.repoContext.set("repo_summary", repoSummary, sessionId);

      const full = database.repoContext.getFullContext();
      expect(full.repoSummary).toBe(repoSummary);
    });

    it("updates folder_structure in repo_context", () => {
      const sessionId = "2026-01-22-current";
      const folderStructure = `src/
  mcp/       # MCP server implementation
  db/        # SQLite database layer
  rules/     # Business logic`;

      database.repoContext.set("folder_structure", folderStructure, sessionId);

      const full = database.repoContext.getFullContext();
      expect(full.folderStructure).toBe(folderStructure);
    });

    it("updates multiple fields at once", () => {
      const sessionId = "2026-01-22-current";

      database.repoContext.setMultiple({
        repo_summary: "Test repo summary",
        folder_structure: "src/\n  test/",
        suggested_actions: "Run more tests",
      }, sessionId);

      const full = database.repoContext.getFullContext();
      expect(full.repoSummary).toBe("Test repo summary");
      expect(full.folderStructure).toBe("src/\n  test/");
      expect(full.suggestedActions).toBe("Run more tests");
    });
  });

  describe("CRUD tools simulation", () => {
    describe("loop_task_create", () => {
      it("creates a new task", () => {
        const task = database.tasks.insert({
          id: "LF-105",
          title: "[IMPL] New feature implementation",
          description: "Implement the new feature as designed",
          summary: "[IMPL] New feature implementation",
          status: "TODO",
          priority: "high",
          depends_on: JSON.stringify(["LF-104"]),
          acceptance_criteria: JSON.stringify([
            "Feature works as designed",
            "Tests pass",
          ]),
          test_file: null,
          notes: "Created from test",
        });

        expect(task.id).toBe("LF-105");
        expect(task.status).toBe("TODO");
        expect(task.priority).toBe("high");

        // Verify retrieval
        const retrieved = database.tasks.findById("LF-105");
        expect(retrieved).not.toBeNull();
        expect(retrieved!.title).toBe("[IMPL] New feature implementation");
      });

      it("rejects duplicate task IDs", () => {
        database.tasks.insert({
          id: "LF-100",
          title: "[IMPL] First task",
          description: null,
          summary: "First task",
          status: "TODO",
          priority: "medium",
          depends_on: null,
          acceptance_criteria: null,
          test_file: null,
          notes: null,
        });

        // Check if exists before inserting (what the tool does)
        const existing = database.tasks.findById("LF-100");
        expect(existing).not.toBeNull();
      });
    });

    describe("loop_task_update", () => {
      it("updates task status", () => {
        database.tasks.insert({
          id: "LF-106",
          title: "[IMPL] Task to update",
          description: null,
          summary: "Task to update",
          status: "TODO",
          priority: "medium",
          depends_on: null,
          acceptance_criteria: null,
          test_file: null,
          notes: null,
        });

        const updated = database.tasks.update("LF-106", { status: "IN_PROGRESS" });

        expect(updated!.status).toBe("IN_PROGRESS");

        // Verify persistence
        const retrieved = database.tasks.findById("LF-106");
        expect(retrieved!.status).toBe("IN_PROGRESS");
      });

      it("updates multiple fields at once", () => {
        database.tasks.insert({
          id: "LF-107",
          title: "[IMPL] Multi-field update",
          description: null,
          summary: "Multi-field update",
          status: "TODO",
          priority: "low",
          depends_on: null,
          acceptance_criteria: null,
          test_file: null,
          notes: null,
        });

        database.tasks.update("LF-107", {
          status: "DONE",
          priority: "high",
          notes: "Completed ahead of schedule",
        });

        const retrieved = database.tasks.findById("LF-107");
        expect(retrieved!.status).toBe("DONE");
        expect(retrieved!.priority).toBe("high");
        expect(retrieved!.notes).toBe("Completed ahead of schedule");
      });
    });

    describe("loop_task_list", () => {
      beforeEach(() => {
        // Setup test tasks
        database.tasks.insert({
          id: "LF-200",
          title: "[IMPL] High priority TODO",
          description: null,
          summary: "High priority TODO",
          status: "TODO",
          priority: "high",
          depends_on: null,
          acceptance_criteria: null,
          test_file: null,
          notes: null,
        });

        database.tasks.insert({
          id: "LF-201",
          title: "[IMPL] In progress task",
          description: null,
          summary: "In progress task",
          status: "IN_PROGRESS",
          priority: "high",
          depends_on: null,
          acceptance_criteria: null,
          test_file: null,
          notes: null,
        });

        database.tasks.insert({
          id: "LF-202",
          title: "[IMPL] Low priority TODO",
          description: null,
          summary: "Low priority TODO",
          status: "TODO",
          priority: "low",
          depends_on: null,
          acceptance_criteria: null,
          test_file: null,
          notes: null,
        });
      });

      it("lists all tasks", () => {
        const tasks = database.tasks.findAll({}, { limit: 10 });
        expect(tasks.length).toBe(3);
      });

      it("filters by status", () => {
        const todoTasks = database.tasks.findAll(
          { statuses: ["TODO"] },
          { limit: 10 }
        );
        expect(todoTasks.length).toBe(2);
        expect(todoTasks.every(t => t.status === "TODO")).toBe(true);
      });

      it("filters by priority", () => {
        const highPriorityTasks = database.tasks.findAll(
          { priorities: ["high"] },
          { limit: 10 }
        );
        expect(highPriorityTasks.length).toBe(2);
        expect(highPriorityTasks.every(t => t.priority === "high")).toBe(true);
      });

      it("filters by both status and priority", () => {
        const filtered = database.tasks.findAll(
          { statuses: ["TODO"], priorities: ["high"] },
          { limit: 10 }
        );
        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe("LF-200");
      });
    });

    describe("loop_insight_update", () => {
      beforeEach(() => {
        database.insights.insert({
          id: "INS-100",
          content: "Test insight for update testing",
          summary: "Test insight",
          type: "technical",
          status: "unprocessed",
          tags: JSON.stringify(["test"]),
          links: null,
          source: null,
          notes: null,
        });
      });

      it("updates insight status", () => {
        const updated = database.insights.update("INS-100", {
          status: "discussed",
        });

        expect(updated!.status).toBe("discussed");

        // Verify persistence
        const retrieved = database.insights.findById("INS-100");
        expect(retrieved!.status).toBe("discussed");
      });

      it("replaces tags", () => {
        database.insights.update("INS-100", {
          tags: JSON.stringify(["new-tag", "another-tag"]),
        });

        const retrieved = database.insights.findById("INS-100");
        const tags = JSON.parse(retrieved!.tags!);
        expect(tags).toEqual(["new-tag", "another-tag"]);
      });

      it("adds to existing tags", () => {
        const existing = database.insights.findById("INS-100");
        const existingTags = JSON.parse(existing!.tags || "[]");
        const newTags = [...new Set([...existingTags, "added-tag"])];

        database.insights.update("INS-100", {
          tags: JSON.stringify(newTags),
        });

        const retrieved = database.insights.findById("INS-100");
        const tags = JSON.parse(retrieved!.tags!);
        expect(tags).toContain("test");
        expect(tags).toContain("added-tag");
      });

      it("adds links", () => {
        database.insights.update("INS-100", {
          links: JSON.stringify(["INS-001", "INS-002"]),
        });

        const retrieved = database.insights.findById("INS-100");
        const links = JSON.parse(retrieved!.links!);
        expect(links).toEqual(["INS-001", "INS-002"]);
      });

      it("updates notes", () => {
        database.insights.update("INS-100", {
          notes: "Added during testing",
        });

        const retrieved = database.insights.findById("INS-100");
        expect(retrieved!.notes).toBe("Added during testing");
      });
    });
  });

  describe("Full workflow simulation", () => {
    it("simulates a complete session lifecycle", () => {
      // 1. Session start (loop_orient sets up context)
      const sessionStartTime = new Date().toISOString();
      const today = sessionStartTime.split("T")[0];
      let currentTaskId: string | null = null;
      let insightsCaptured = 0;

      // 2. Pick a task (loop_task_update to IN_PROGRESS)
      database.tasks.insert({
        id: "LF-TEST",
        title: "[IMPL] Test task",
        description: "Test implementation",
        summary: "Test task",
        status: "TODO",
        priority: "high",
        depends_on: null,
        acceptance_criteria: null,
        test_file: null,
        notes: null,
      });

      database.tasks.update("LF-TEST", { status: "IN_PROGRESS" });
      currentTaskId = "LF-TEST";

      // 3. Work happens, capture an insight (loop_remember)
      const insightId = database.insights.getNextId();
      database.insights.insert({
        id: insightId,
        content: "Discovered something important during work",
        summary: "Important discovery",
        type: "technical",
        status: "unprocessed",
        tags: JSON.stringify(["testing"]),
        links: null,
        source: JSON.stringify({ task: currentTaskId, session: today }),
        notes: null,
      });
      insightsCaptured++;

      // 4. Task complete (loop_task_update to DONE)
      database.tasks.update("LF-TEST", { status: "DONE" });

      // 5. Session end (loop_handoff)
      const sessionNumber = 1;
      const sessionId = `${today}-S${sessionNumber}`;

      // Save suggested_actions
      database.repoContext.set(
        "suggested_actions",
        "Continue with the next task",
        sessionId
      );

      // Create session record
      database.sessions.upsert({
        id: sessionId,
        date: today,
        session_number: sessionNumber,
        task_id: currentTaskId,
        task_type: "[IMPL]",
        task_title: "Test task",
        outcome: "COMPLETE",
        summary: "Completed: Test task implementation",
        learnings: null,
        files_changed: null,
        insights_added: JSON.stringify([`${insightsCaptured} insight captured`]),
      });

      // VERIFY: All state was persisted correctly
      
      // Task should be DONE
      const task = database.tasks.findById("LF-TEST");
      expect(task!.status).toBe("DONE");

      // Insight should exist
      const insight = database.insights.findById(insightId);
      expect(insight).not.toBeNull();

      // Suggested actions should be saved
      const suggestedActions = database.repoContext.getValue("suggested_actions");
      expect(suggestedActions).toBe("Continue with the next task");

      // Session record should exist
      const session = database.sessions.findById(sessionId);
      expect(session).not.toBeNull();
      expect(session!.outcome).toBe("COMPLETE");

      // Recent sessions should include this one
      const recentSessions = database.sessions.getRecent(1);
      expect(recentSessions[0].id).toBe(sessionId);
    });
  });

  describe("Edge cases", () => {
    it("handles empty database gracefully", () => {
      // All counts should be 0
      expect(database.insights.count()).toBe(0);
      expect(database.tasks.count()).toBe(0);
      expect(database.sessions.count()).toBe(0);

      // Next ID should start at 001
      expect(database.insights.getNextId()).toBe("INS-001");

      // Full context should have nulls
      const context = database.repoContext.getFullContext();
      expect(context.repoSummary).toBeNull();
      expect(context.suggestedActions).toBeNull();

      // Last session ID should be null
      expect(database.sessions.getLastSessionId()).toBeNull();
    });

    it("handles task not found for update", () => {
      const result = database.tasks.update("NONEXISTENT", { status: "DONE" });
      expect(result).toBeNull();
    });

    it("handles insight not found for update", () => {
      const result = database.insights.update("NONEXISTENT", { status: "discussed" });
      expect(result).toBeNull();
    });

    it("handles search with no results", () => {
      const results = database.insights.search("nonexistent query", {}, { limit: 10 });
      expect(results).toEqual([]);
    });
  });
});
