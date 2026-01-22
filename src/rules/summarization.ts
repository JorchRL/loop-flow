/**
 * Summarization Rules (Pure Functions)
 * 
 * Heuristic-based summary generation for progressive disclosure.
 * No I/O - all functions are pure.
 */

const DEFAULT_MAX_LENGTH = 100;
const SENTENCE_TERMINATORS = /[.!?]/;

/**
 * Extract first sentence from text.
 * Returns the full text if no sentence terminator found.
 */
export function extractFirstSentence(text: string): string {
  const trimmed = text.trim();
  
  // Find first sentence terminator
  const match = trimmed.match(SENTENCE_TERMINATORS);
  if (match && match.index !== undefined) {
    return trimmed.slice(0, match.index + 1);
  }
  
  return trimmed;
}

/**
 * Truncate text at word boundary, adding ellipsis if truncated.
 * Guarantees result.length <= maxLength.
 */
export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Reserve space for ellipsis
  const maxContentLength = maxLength - 3;
  if (maxContentLength <= 0) return "...".slice(0, maxLength);
  
  // Find last space before maxContentLength
  const truncated = text.slice(0, maxContentLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  if (lastSpace > maxContentLength * 0.5) {
    return truncated.slice(0, lastSpace) + "...";
  }
  
  // No good word boundary, just truncate at limit
  return truncated + "...";
}

/**
 * Generate summary for an insight.
 * Strategy: First sentence, truncated if too long.
 */
export function summarizeInsight(content: string, maxLength = DEFAULT_MAX_LENGTH): string {
  const firstSentence = extractFirstSentence(content);
  return truncateAtWord(firstSentence, maxLength);
}

/**
 * Generate summary for a task.
 * Strategy: Preserve [TYPE] prefix + short title.
 */
export function summarizeTask(title: string, maxLength = DEFAULT_MAX_LENGTH): string {
  // Extract type prefix if present
  const typeMatch = title.match(/^\[([A-Z]+)\]\s*/);
  
  if (typeMatch) {
    const prefix = typeMatch[0];
    const rest = title.slice(prefix.length);
    const maxRest = maxLength - prefix.length;
    return prefix + truncateAtWord(rest, maxRest);
  }
  
  return truncateAtWord(title, maxLength);
}

/**
 * Check if content is "short" (doesn't need summarization).
 * Short content can be shown directly in scan results.
 */
export function isShortContent(content: string, threshold = 150): boolean {
  return content.length <= threshold;
}

/**
 * Generate a summary, or return null if content is short enough.
 */
export function maybeGenerateSummary(
  content: string,
  type: "insight" | "task",
  maxLength = DEFAULT_MAX_LENGTH
): string | null {
  if (isShortContent(content, maxLength * 1.5)) {
    return null; // No summary needed, content is short
  }
  
  return type === "insight" 
    ? summarizeInsight(content, maxLength)
    : summarizeTask(content, maxLength);
}
