/**
 * Progress.txt Parser
 * 
 * Pure functions to parse progress.txt into structured session records.
 * Progress.txt is markdown with session entries like:
 * 
 * ## 2026-01-22 | Session 21 (Skills Cleanup)
 * Task: LF-078 [IMPL] Remove obsolete skills
 * Outcome: COMPLETE
 * ...
 */

export interface ParsedSession {
  id: string;                    // "2026-01-22-S21"
  date: string;                  // "2026-01-22"
  sessionNumber: number;         // 21
  title: string;                 // "Skills Cleanup"
  taskId: string | null;         // "LF-078"
  taskType: string | null;       // "[IMPL]"
  taskTitle: string | null;      // "Remove obsolete skills"
  outcome: string | null;        // "COMPLETE"
  summary: string;               // Main content
  learnings: string | null;      // Learnings section content
  filesChanged: string[] | null; // Extracted file paths
  insightsAdded: string[] | null; // Extracted insight IDs
}

/**
 * Parse a single session entry from progress.txt
 */
export function parseSessionEntry(header: string, content: string): ParsedSession | null {
  // Parse header: "## 2026-01-22 | Session 21 (Skills Cleanup)"
  const headerMatch = header.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*\|\s*Session\s+(\d+[a-z]?)\s*(?:\(([^)]+)\))?/i);
  if (!headerMatch) return null;

  const date = headerMatch[1];
  const sessionNumStr = headerMatch[2];
  // Handle "21b" style suffixes by treating them as sub-sessions
  const sessionNumber = parseInt(sessionNumStr.replace(/[a-z]/i, ''), 10);
  const title = headerMatch[3]?.trim() || `Session ${sessionNumStr}`;
  
  // Generate ID
  const id = `${date}-S${sessionNumStr}`;

  // Parse task line: "Task: LF-078 [IMPL] Remove obsolete skills"
  const taskMatch = content.match(/^Task:\s*(?:(LF-\d+(?:\.\d+)?)\s*)?(\[[A-Z]+\])?\s*(.+)?$/m);
  let taskId: string | null = null;
  let taskType: string | null = null;
  let taskTitle: string | null = null;
  
  if (taskMatch) {
    taskId = taskMatch[1] || null;
    taskType = taskMatch[2] || null;
    taskTitle = taskMatch[3]?.trim() || null;
  }

  // Parse outcome: "Outcome: COMPLETE"
  const outcomeMatch = content.match(/^Outcome:\s*(.+)$/m);
  const outcome = outcomeMatch?.[1]?.trim() || null;

  // Extract summary section (### Summary)
  const summaryMatch = content.match(/###\s*Summary\s*\n([\s\S]*?)(?=\n###|\n---|$)/);
  const summary = summaryMatch?.[1]?.trim() || content.substring(0, 500).trim();

  // Extract learnings section
  const learningsMatch = content.match(/###\s*Learnings?\s*\n([\s\S]*?)(?=\n###|\n---|$)/);
  const learnings = learningsMatch?.[1]?.trim() || null;

  // Extract file paths (look for patterns like `file.ts`, path/to/file.ts)
  const fileMatches = content.match(/[`*-]\s*`?([a-zA-Z0-9_\-./]+\.[a-z]{2,4})`?/g);
  const filesChanged = fileMatches 
    ? [...new Set(fileMatches.map(m => m.replace(/^[`*-\s]+`?|`?$/g, '')))]
    : null;

  // Extract insight IDs (INS-XXX pattern)
  const insightMatches = content.match(/INS-\d{3}/g);
  const insightsAdded = insightMatches ? [...new Set(insightMatches)] : null;

  return {
    id,
    date,
    sessionNumber,
    title,
    taskId,
    taskType,
    taskTitle,
    outcome,
    summary,
    learnings,
    filesChanged,
    insightsAdded,
  };
}

/**
 * Parse entire progress.txt file into session records
 */
export function parseProgressFile(content: string): ParsedSession[] {
  const sessions: ParsedSession[] = [];
  
  // Split by session headers
  const parts = content.split(/(?=^## \d{4}-\d{2}-\d{2})/m);
  
  for (const part of parts) {
    if (!part.trim()) continue;
    
    // Extract header line
    const lines = part.split('\n');
    const headerLine = lines[0];
    
    if (!headerLine.startsWith('## ')) continue;
    
    // Rest is content
    const contentText = lines.slice(1).join('\n');
    
    const session = parseSessionEntry(headerLine, contentText);
    if (session) {
      sessions.push(session);
    }
  }
  
  return sessions;
}

/**
 * Get the N most recent sessions
 */
export function getRecentSessions(sessions: ParsedSession[], n: number): ParsedSession[] {
  // Sessions are typically in chronological order, so we want the last N
  return sessions.slice(-n);
}
