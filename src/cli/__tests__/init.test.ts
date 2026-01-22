/**
 * Tests for loopflow init command
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { initLoopFlow } from "../init.js";

describe("initLoopFlow", () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "loopflow-test-"));
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("creates .loop-flow directory structure", async () => {
    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(testDir, ".loop-flow"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, ".loop-flow", "plan"))).toBe(true);
  });

  it("creates SQLite database with schema", async () => {
    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(true);
    const dbPath = path.join(testDir, ".loop-flow", "loopflow.db");
    expect(fs.existsSync(dbPath)).toBe(true);
    
    // Verify it's a valid SQLite database
    const stats = fs.statSync(dbPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it("creates WORKFLOW.md", async () => {
    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(true);
    const workflowPath = path.join(testDir, ".loop-flow", "WORKFLOW.md");
    expect(fs.existsSync(workflowPath)).toBe(true);
    
    const content = fs.readFileSync(workflowPath, "utf-8");
    expect(content).toContain("LoopFlow Workflow Rules");
    expect(content).toContain("loop_orient");
  });

  it("creates AGENTS.md by default", async () => {
    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(true);
    const agentsPath = path.join(testDir, "AGENTS.md");
    expect(fs.existsSync(agentsPath)).toBe(true);
    
    const content = fs.readFileSync(agentsPath, "utf-8");
    expect(content).toContain("loop_orient");
  });

  it("skips AGENTS.md with noAgentsMd option", async () => {
    const result = await initLoopFlow({ path: testDir, noAgentsMd: true });

    expect(result.success).toBe(true);
    const agentsPath = path.join(testDir, "AGENTS.md");
    expect(fs.existsSync(agentsPath)).toBe(false);
  });

  it("appends to existing AGENTS.md", async () => {
    // Create existing AGENTS.md
    const agentsPath = path.join(testDir, "AGENTS.md");
    fs.writeFileSync(agentsPath, "# My Project Rules\n\nBe nice.\n");

    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(true);
    const content = fs.readFileSync(agentsPath, "utf-8");
    expect(content).toContain("My Project Rules");
    expect(content).toContain("Be nice");
    expect(content).toContain("loop_orient");
  });

  it("does not duplicate hook in AGENTS.md", async () => {
    // Create AGENTS.md with hook already present
    const agentsPath = path.join(testDir, "AGENTS.md");
    fs.writeFileSync(agentsPath, "# Rules\n\nCall loop_orient at start.\n");

    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(true);
    expect(result.skipped).toContain("AGENTS.md (hook already present)");
  });

  it("fails if already initialized without --force", async () => {
    // First init
    await initLoopFlow({ path: testDir });
    
    // Second init should fail
    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already initialized");
  });

  it("reinitializes with force option", async () => {
    // First init
    await initLoopFlow({ path: testDir });
    
    // Second init with force
    const result = await initLoopFlow({ path: testDir, force: true });

    expect(result.success).toBe(true);
  });

  it("creates empty JSON files for backward compatibility", async () => {
    const result = await initLoopFlow({ path: testDir });

    expect(result.success).toBe(true);
    
    const insightsPath = path.join(testDir, ".loop-flow", "plan", "insights.json");
    const backlogPath = path.join(testDir, ".loop-flow", "plan", "backlog.json");
    
    expect(fs.existsSync(insightsPath)).toBe(true);
    expect(fs.existsSync(backlogPath)).toBe(true);
    
    const insights = JSON.parse(fs.readFileSync(insightsPath, "utf-8"));
    expect(insights.insights).toEqual([]);
    
    const backlog = JSON.parse(fs.readFileSync(backlogPath, "utf-8"));
    expect(backlog.tasks).toEqual([]);
  });
});
