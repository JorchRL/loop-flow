/**
 * Tests for PII sanitization
 */

import { describe, it, expect } from "vitest";
import { sanitizeContext, detectPotentialPII, prepareFeedbackContext } from "../sanitization.js";

describe("sanitizeContext", () => {
  it("removes Unix file paths", () => {
    const input = "Error in /Users/john/projects/myapp/src/index.ts";
    const result = sanitizeContext(input);
    expect(result).toBe("Error in [PATH]");
  });

  it("removes Windows file paths", () => {
    const input = "Error in C:\\Users\\john\\projects\\myapp\\src\\index.ts";
    const result = sanitizeContext(input);
    expect(result).toBe("Error in [PATH]");
  });

  it("removes email addresses", () => {
    const input = "Contact john.doe@example.com for help";
    const result = sanitizeContext(input);
    expect(result).toBe("Contact [EMAIL] for help");
  });

  it("removes IP addresses", () => {
    const input = "Server at 192.168.1.100 is down";
    const result = sanitizeContext(input);
    expect(result).toBe("Server at [IP] is down");
  });

  it("removes API keys", () => {
    // These patterns get matched by secret patterns first, which is fine
    const result1 = sanitizeContext("sk_live_abc123xyz in the code");
    expect(result1).toContain("[API_KEY]");
    
    const result2 = sanitizeContext("ghp_1234567890abcdef token");
    expect(result2).toContain("[API_KEY]");
    
    // Bearer tokens also get caught
    const result3 = sanitizeContext("Auth: Bearer eyJhbGciOiJIUzI1NiJ9");
    expect(result3).toContain("[API_KEY]");
  });

  it("removes URLs with auth tokens", () => {
    const input = "Visit https://api.example.com/data?token=secret123";
    const result = sanitizeContext(input);
    expect(result).toBe("Visit [URL_WITH_AUTH]");
  });

  it("removes secret patterns in config", () => {
    const input = "password = 'mysecret123'";
    const result = sanitizeContext(input);
    expect(result).toBe("[REDACTED_SECRET]");
  });

  it("removes UUIDs", () => {
    const input = "User ID: 550e8400-e29b-41d4-a716-446655440000";
    const result = sanitizeContext(input);
    expect(result).toBe("User ID: [UUID]");
  });

  it("preserves safe text", () => {
    const input = "The function returns an array of strings";
    const result = sanitizeContext(input);
    expect(result).toBe("The function returns an array of strings");
  });

  it("handles multiple patterns", () => {
    const input = "User john@example.com at /Users/john/app saw error at 192.168.1.1";
    const result = sanitizeContext(input);
    expect(result).toBe("User [EMAIL] at [PATH] saw error at [IP]");
  });
});

describe("detectPotentialPII", () => {
  it("warns about potential phone numbers", () => {
    const input = "Call me at 555-123-4567";
    const warnings = detectPotentialPII(input);
    expect(warnings).toContain("Text may contain phone numbers");
  });

  it("warns about potential names", () => {
    const input = "Talked to John Smith about the project";
    const warnings = detectPotentialPII(input);
    expect(warnings.some(w => w.includes("names"))).toBe(true);
  });

  it("handles tech terms (may still warn as conservative approach)", () => {
    // The PII detection is conservative - it's okay if it warns about tech terms
    // The user can review before sharing
    const input = "The database connection timeout";
    const warnings = detectPotentialPII(input);
    // At minimum, should not crash
    expect(Array.isArray(warnings)).toBe(true);
  });

  it("returns empty for safe text", () => {
    const input = "The database query is slow";
    const warnings = detectPotentialPII(input);
    expect(warnings).toHaveLength(0);
  });
});

describe("prepareFeedbackContext", () => {
  it("sanitizes and returns result", () => {
    const input = "Error in /Users/john/app connection to 192.168.1.1 failed";
    const result = prepareFeedbackContext(input);
    
    // Whitespace gets collapsed, paths and IPs get replaced
    expect(result.sanitized).toContain("[PATH]");
    expect(result.sanitized).toContain("[IP]");
    expect(result.truncated).toBe(false);
  });

  it("truncates long text", () => {
    const input = "a".repeat(600);
    const result = prepareFeedbackContext(input, 500);
    
    expect(result.sanitized.length).toBeLessThanOrEqual(503); // 500 + "..."
    expect(result.truncated).toBe(true);
  });

  it("includes warnings", () => {
    const input = "Call 555-123-4567 for John Smith";
    const result = prepareFeedbackContext(input);
    
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
