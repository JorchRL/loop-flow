/**
 * Export Rules (Pure Functions)
 * 
 * Generate JSON and TXT exports from database records.
 * No I/O - all functions are pure.
 */

import type { InsightRecord } from "../db/repositories/insights.js";
import type { TaskRecord } from "../db/repositories/tasks.js";
import { recordToJsonInsight, recordToJsonTask } from "./migration.js";
import { VERSION } from "../index.js";

// =============================================================================
// Export Types
// =============================================================================

export interface ExportedInsightsFile {
  schema_version: string;
  description: string;
  exported_at: string;
  source: "loopflow-sqlite";
  insights: Array<{
    id: string;
    content: string;
    type: string;
    status: string;
    source?: {
      task?: string;
      session?: string;
      original_id?: string;
    };
    tags?: string[];
    links?: string[];
    notes?: string;
    created: string;
  }>;
}

export interface ExportedBacklogFile {
  project: string;
  last_updated: string;
  notes: string;
  exported_at: string;
  source: "loopflow-sqlite";
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    depends_on?: string[];
    acceptance_criteria?: string[];
    test_file?: string;
    notes?: string;
  }>;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Generate insights.json content from database records
 */
export function generateInsightsJson(
  records: InsightRecord[],
  schemaVersion: string = VERSION
): ExportedInsightsFile {
  return {
    schema_version: schemaVersion,
    description: "Structured learnings (zettelkasten). Links form a knowledge graph.",
    exported_at: new Date().toISOString(),
    source: "loopflow-sqlite",
    insights: records.map(recordToJsonInsight),
  };
}

/**
 * Generate backlog.json content from database records
 */
export function generateBacklogJson(
  records: TaskRecord[],
  projectName: string,
  projectNotes: string = ""
): ExportedBacklogFile {
  return {
    project: projectName,
    last_updated: new Date().toISOString().split("T")[0],
    notes: projectNotes,
    exported_at: new Date().toISOString(),
    source: "loopflow-sqlite",
    tasks: records.map(recordToJsonTask),
  };
}

/**
 * Generate progress.txt session entry
 */
export function generateProgressEntry(
  sessionNumber: number,
  taskId: string | null,
  taskTitle: string | null,
  outcome: "COMPLETE" | "PARTIAL" | "BLOCKED",
  summary: string,
  learnings: string[] = [],
  manualQa: "REQUIRED" | "NOT_REQUIRED" = "NOT_REQUIRED"
): string {
  const date = new Date().toISOString().split("T")[0];
  
  let entry = `## ${date} | Session ${sessionNumber}\n`;
  entry += `Task: ${taskId ? `${taskId} ${taskTitle || ""}` : "N/A"}\n`;
  entry += `Outcome: ${outcome}\n`;
  entry += `Manual QA: ${manualQa}\n\n`;
  entry += `### Summary\n\n${summary}\n`;
  
  if (learnings.length > 0) {
    entry += `\n### Learnings\n\n`;
    for (const learning of learnings) {
      entry += `- ${learning}\n`;
    }
  }
  
  entry += `\n---\n\n`;
  
  return entry;
}

// =============================================================================
// Stats
// =============================================================================

export interface ExportStats {
  insights: number;
  tasks: number;
  progressEntryAdded: boolean;
}
