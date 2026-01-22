/**
 * Migration Transform Rules (Pure Functions)
 * 
 * Transform between JSON file formats and database records.
 * No I/O - all functions are pure.
 */

import type { InsightRecord } from "../db/repositories/insights.js";
import type { TaskRecord } from "../db/repositories/tasks.js";
import { summarizeInsight, summarizeTask } from "./summarization.js";

// =============================================================================
// JSON Types (from file-based LoopFlow)
// =============================================================================

export interface JsonInsight {
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
}

export interface JsonTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  depends_on?: string[];
  acceptance_criteria?: string[];
  test_file?: string;
  notes?: string;
}

export interface JsonBacklog {
  project?: string;
  last_updated?: string;
  notes?: string;
  tasks: JsonTask[];
}

export interface JsonInsightsFile {
  schema_version?: string;
  description?: string;
  insights: JsonInsight[];
}

// =============================================================================
// Transforms: JSON -> Database Record
// =============================================================================

export function jsonInsightToRecord(json: JsonInsight): Omit<InsightRecord, "created_at" | "updated_at"> {
  return {
    id: json.id,
    content: json.content,
    summary: summarizeInsight(json.content),
    type: json.type,
    status: json.status,
    tags: json.tags ? JSON.stringify(json.tags) : null,
    links: json.links ? JSON.stringify(json.links) : null,
    source: json.source ? JSON.stringify(json.source) : null,
    notes: json.notes ?? null,
  };
}

export function jsonTaskToRecord(json: JsonTask): Omit<TaskRecord, "created_at" | "updated_at"> {
  return {
    id: json.id,
    title: json.title,
    description: json.description ?? null,
    summary: summarizeTask(json.title),
    status: json.status,
    priority: json.priority ?? "medium",
    depends_on: json.depends_on ? JSON.stringify(json.depends_on) : null,
    acceptance_criteria: json.acceptance_criteria ? JSON.stringify(json.acceptance_criteria) : null,
    test_file: json.test_file ?? null,
    notes: json.notes ?? null,
  };
}

// =============================================================================
// Transforms: Database Record -> JSON
// =============================================================================

export function recordToJsonInsight(record: InsightRecord): JsonInsight {
  return {
    id: record.id,
    content: record.content,
    type: record.type,
    status: record.status,
    source: record.source ? JSON.parse(record.source) : undefined,
    tags: record.tags ? JSON.parse(record.tags) : undefined,
    links: record.links ? JSON.parse(record.links) : undefined,
    notes: record.notes ?? undefined,
    created: record.created_at,
  };
}

export function recordToJsonTask(record: TaskRecord): JsonTask {
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? undefined,
    status: record.status,
    priority: record.priority,
    depends_on: record.depends_on ? JSON.parse(record.depends_on) : undefined,
    acceptance_criteria: record.acceptance_criteria ? JSON.parse(record.acceptance_criteria) : undefined,
    test_file: record.test_file ?? undefined,
    notes: record.notes ?? undefined,
  };
}

// =============================================================================
// Batch Transforms
// =============================================================================

export function transformInsightsFile(file: JsonInsightsFile): Array<Omit<InsightRecord, "created_at" | "updated_at">> {
  return file.insights.map(jsonInsightToRecord);
}

export function transformBacklogFile(file: JsonBacklog): Array<Omit<TaskRecord, "created_at" | "updated_at">> {
  return file.tasks.map(jsonTaskToRecord);
}

// =============================================================================
// Validation
// =============================================================================

export function validateInsight(json: unknown): json is JsonInsight {
  if (typeof json !== "object" || json === null) return false;
  const obj = json as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.content === "string" &&
    typeof obj.type === "string" &&
    typeof obj.status === "string"
  );
}

export function validateTask(json: unknown): json is JsonTask {
  if (typeof json !== "object" || json === null) return false;
  const obj = json as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.status === "string"
  );
}
