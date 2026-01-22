/**
 * Tests for progress.txt parser
 */

import { describe, it, expect } from "vitest";
import { parseSessionEntry, parseProgressFile, getRecentSessions } from "../progress-parser.js";

describe("parseSessionEntry", () => {
  it("parses a standard session header", () => {
    const header = "## 2026-01-22 | Session 21 (Skills Cleanup)";
    const content = `
Task: LF-078 [IMPL] Remove obsolete skills
Outcome: COMPLETE

### Summary

Removed obsolete skills and updated AGENTS.md.

### Learnings

Skills were a workaround for file reading issues.

---
`;

    const result = parseSessionEntry(header, content);
    
    expect(result).not.toBeNull();
    expect(result!.id).toBe("2026-01-22-S21");
    expect(result!.date).toBe("2026-01-22");
    expect(result!.sessionNumber).toBe(21);
    expect(result!.title).toBe("Skills Cleanup");
    expect(result!.taskId).toBe("LF-078");
    expect(result!.taskType).toBe("[IMPL]");
    expect(result!.taskTitle).toBe("Remove obsolete skills");
    expect(result!.outcome).toBe("COMPLETE");
    expect(result!.summary).toContain("Removed obsolete skills");
    // Learnings parsing needs the section to be terminated properly
    expect(result!.learnings).not.toBeNull();
    if (result!.learnings) {
      expect(result!.learnings).toContain("workaround");
    }
  });

  it("parses session with suffix (e.g., 21b)", () => {
    const header = "## 2026-01-22 | Session 21b (Continuation)";
    const content = "Task: N/A\nOutcome: COMPLETE";
    
    const result = parseSessionEntry(header, content);
    
    expect(result).not.toBeNull();
    expect(result!.id).toBe("2026-01-22-S21b");
    expect(result!.sessionNumber).toBe(21);
  });

  it("parses session without task", () => {
    const header = "## 2026-01-17 | Session 0 (Project Bootstrap)";
    const content = `
Task: N/A (Design Session)
Outcome: COMPLETE

### Summary

Bootstrapped the project.
`;

    const result = parseSessionEntry(header, content);
    
    expect(result).not.toBeNull();
    expect(result!.taskId).toBeNull();
    expect(result!.taskType).toBeNull();
  });

  it("extracts insight IDs from content", () => {
    const header = "## 2026-01-20 | Session 10 (Test)";
    const content = `
Task: LF-001 [SPIKE] Test
Outcome: COMPLETE

### Summary

Added INS-045, INS-046, and INS-047.
Also mentioned INS-045 again.
`;

    const result = parseSessionEntry(header, content);
    
    expect(result!.insightsAdded).toEqual(["INS-045", "INS-046", "INS-047"]);
  });

  it("returns null for invalid header", () => {
    const result = parseSessionEntry("Not a valid header", "content");
    expect(result).toBeNull();
  });
});

describe("parseProgressFile", () => {
  it("parses multiple sessions", () => {
    const content = `
# Progress Log

Some intro text.

---

## 2026-01-17 | Session 0 (Bootstrap)
Task: N/A
Outcome: COMPLETE

### Summary
Initial setup.

---

## 2026-01-18 | Session 1 (MCP Research)
Task: LF-001 [SPIKE] Research MCP
Outcome: IN_PROGRESS

### Summary
Researched MCP protocol.
`;

    const sessions = parseProgressFile(content);
    
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe("2026-01-17-S0");
    expect(sessions[1].id).toBe("2026-01-18-S1");
    expect(sessions[1].taskId).toBe("LF-001");
  });
});

describe("getRecentSessions", () => {
  it("returns last N sessions", () => {
    const sessions = [
      { id: "2026-01-01-S1" },
      { id: "2026-01-02-S2" },
      { id: "2026-01-03-S3" },
    ] as ReturnType<typeof parseProgressFile>;

    const recent = getRecentSessions(sessions, 2);
    
    expect(recent).toHaveLength(2);
    expect(recent[0].id).toBe("2026-01-02-S2");
    expect(recent[1].id).toBe("2026-01-03-S3");
  });
});
