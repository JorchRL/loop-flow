/**
 * PII Sanitization for Feedback Specs
 * 
 * Strips potentially sensitive information from context before sharing.
 * Conservative approach - better to over-sanitize than leak PII.
 */

/**
 * Sanitize text content by removing potentially sensitive information:
 * - File paths (absolute paths)
 * - Email addresses
 * - IP addresses
 * - API keys / tokens (common patterns)
 * - URLs with auth tokens
 * - Names (common patterns, conservative)
 */
export function sanitizeContext(text: string): string {
  let sanitized = text;

  // Remove absolute file paths (Unix and Windows)
  // /Users/username/... or C:\Users\username\...
  sanitized = sanitized.replace(
    /(?:\/(?:Users|home|var|tmp|etc|opt)\/[^\s'"]+|[A-Z]:\\[^\s'"]+)/gi,
    "[PATH]"
  );

  // Remove email addresses
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL]"
  );

  // Remove IP addresses
  sanitized = sanitized.replace(
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    "[IP]"
  );

  // Remove common API key patterns
  // sk_live_xxx, pk_test_xxx, ghp_xxx, etc.
  sanitized = sanitized.replace(
    /\b(?:sk_(?:live|test)_[a-zA-Z0-9]+|pk_(?:live|test)_[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]+|gho_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9]+|xox[baprs]-[a-zA-Z0-9-]+|Bearer\s+[a-zA-Z0-9._-]+)/gi,
    "[API_KEY]"
  );

  // Remove URLs with potential auth tokens in query params
  sanitized = sanitized.replace(
    /https?:\/\/[^\s]+(?:token|key|secret|password|auth|api_key)=[^\s&]+/gi,
    "[URL_WITH_AUTH]"
  );

  // Remove common secret/password patterns in config-like text
  sanitized = sanitized.replace(
    /(?:password|secret|token|api_key|apiKey|AUTH_TOKEN|PRIVATE_KEY)\s*[=:]\s*['"]?[^\s'"]+['"]?/gi,
    "[REDACTED_SECRET]"
  );

  // Remove UUIDs (often used as identifiers)
  sanitized = sanitized.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "[UUID]"
  );

  // Collapse multiple consecutive whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

/**
 * Check if text contains potential PII that couldn't be fully sanitized.
 * Returns warnings for human review.
 */
export function detectPotentialPII(text: string): string[] {
  const warnings: string[] = [];

  // Check for remaining @ symbols (might be emails that weren't caught)
  if (/@/.test(text) && !/\[EMAIL\]/.test(text)) {
    warnings.push("Text may contain email addresses");
  }

  // Check for phone number patterns
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
    warnings.push("Text may contain phone numbers");
  }

  // Check for potential names (capitalized words that aren't common tech terms)
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g);
  if (capitalizedWords && capitalizedWords.length > 0) {
    // Filter out common tech terms
    const techTerms = new Set([
      "React Native", "Visual Studio", "GitHub Actions", "Google Cloud",
      "Amazon Web", "Microsoft Azure", "Open Source", "Type Script",
      "Node Js", "Next Js", "Vue Js",
    ]);
    const potentialNames = capitalizedWords.filter(w => !techTerms.has(w));
    if (potentialNames.length > 0) {
      warnings.push(`Text may contain names: ${potentialNames.slice(0, 3).join(", ")}`);
    }
  }

  return warnings;
}

/**
 * Generate a sanitized summary of context for feedback sharing.
 * Returns both the sanitized text and any warnings.
 */
export function prepareFeedbackContext(
  context: string,
  maxLength = 500
): { sanitized: string; warnings: string[]; truncated: boolean } {
  const sanitized = sanitizeContext(context);
  const warnings = detectPotentialPII(sanitized);
  const truncated = sanitized.length > maxLength;

  return {
    sanitized: truncated ? sanitized.substring(0, maxLength) + "..." : sanitized,
    warnings,
    truncated,
  };
}
