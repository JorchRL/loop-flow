import { describe, it, expect } from "vitest";
import {
  extractFirstSentence,
  truncateAtWord,
  summarizeInsight,
  summarizeTask,
  isShortContent,
} from "../summarization.js";

describe("extractFirstSentence", () => {
  it("extracts first sentence ending with period", () => {
    expect(extractFirstSentence("Hello world. This is more."))
      .toBe("Hello world.");
  });

  it("extracts first sentence ending with exclamation", () => {
    expect(extractFirstSentence("Hello world! This is more."))
      .toBe("Hello world!");
  });

  it("extracts first sentence ending with question mark", () => {
    expect(extractFirstSentence("Hello world? This is more."))
      .toBe("Hello world?");
  });

  it("returns full text if no sentence terminator", () => {
    expect(extractFirstSentence("Hello world"))
      .toBe("Hello world");
  });

  it("handles empty string", () => {
    expect(extractFirstSentence("")).toBe("");
  });
});

describe("truncateAtWord", () => {
  it("returns unchanged if under limit", () => {
    expect(truncateAtWord("Hello world", 20)).toBe("Hello world");
  });

  it("truncates at word boundary when space is far enough", () => {
    // "Hello beautiful" is 15 chars, minus 3 for "..." = 12 chars max
    // "Hello" is at index 5, but 5 < 12*0.5=6, so no good word boundary
    // Result: "Hello beauti..." (exactly 15 chars)
    expect(truncateAtWord("Hello beautiful world", 15))
      .toBe("Hello beauti...");
  });

  it("truncates at word boundary when space is close enough", () => {
    // "Abcdefghij klmnop" with limit 16
    // maxContent = 13, last space at 10, 10 > 13*0.5=6.5 ✓
    expect(truncateAtWord("Abcdefghij klmnop", 16))
      .toBe("Abcdefghij...");
  });

  it("respects maxLength strictly", () => {
    const result = truncateAtWord("Hello beautiful world", 15);
    expect(result.length).toBeLessThanOrEqual(15);
  });

  it("handles exact limit", () => {
    expect(truncateAtWord("Hello", 5)).toBe("Hello");
  });

  it("adds ellipsis when truncating", () => {
    const result = truncateAtWord("This is a very long sentence that needs truncation", 30);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(30);
  });
});

describe("summarizeInsight", () => {
  it("summarizes long content to first sentence", () => {
    const content = "LoopFlow is a workflow system. It helps developers manage sessions. It preserves theory.";
    const summary = summarizeInsight(content, 100);
    expect(summary).toBe("LoopFlow is a workflow system.");
  });

  it("truncates long first sentence", () => {
    const content = "This is a very very very very very very very very very very very very very very very long first sentence that exceeds the limit";
    const summary = summarizeInsight(content, 50);
    expect(summary.length).toBeLessThanOrEqual(50);
    expect(summary.endsWith("...")).toBe(true);
  });

  it("handles short content", () => {
    const content = "Short insight.";
    expect(summarizeInsight(content, 100)).toBe("Short insight.");
  });
});

describe("summarizeTask", () => {
  it("preserves task type prefix", () => {
    const title = "[IMPL] SQLite Schema & Migrations";
    expect(summarizeTask(title, 100)).toBe("[IMPL] SQLite Schema & Migrations");
  });

  it("truncates long title after prefix", () => {
    const title = "[DESIGN] This is a very very very very long task title that needs to be truncated";
    const summary = summarizeTask(title, 50);
    expect(summary.startsWith("[DESIGN] ")).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(50);
  });

  it("handles title without prefix", () => {
    const title = "Simple task title";
    expect(summarizeTask(title, 100)).toBe("Simple task title");
  });
});

describe("isShortContent", () => {
  it("returns true for short content", () => {
    expect(isShortContent("Short", 100)).toBe(true);
  });

  it("returns false for long content", () => {
    expect(isShortContent("A".repeat(200), 100)).toBe(false);
  });

  it("returns true at exact threshold", () => {
    expect(isShortContent("A".repeat(100), 100)).toBe(true);
  });
});
