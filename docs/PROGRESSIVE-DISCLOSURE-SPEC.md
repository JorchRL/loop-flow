# Progressive Disclosure & Token-Efficient Retrieval

## Specification Document v1.1

**Status**: DRAFT  
**Created**: 2026-01-21  
**Updated**: 2026-01-21  
**Task**: LF-049  

---

## Module Summary

| # | Module | Location | Purity | Purpose |
|---|--------|----------|--------|---------|
| 1 | Schema | `src/db/schema.ts` | Impure | SQLite schema & migrations |
| 2 | Repositories | `src/db/repositories/` | Impure | Data access abstraction |
| 3 | Summarization | `src/rules/summarization.ts` | **Pure** | Summary generation |
| 4 | Scoring | `src/rules/scoring.ts` | **Pure** | Relevance scoring |
| 5 | Migration Transforms | `src/rules/migration.ts` | **Pure** | JSON ↔ DB transforms |
| 6 | Filtering | `src/rules/filtering.ts` | **Pure** | Filter predicates |
| 7 | Search Service | `src/services/search.ts` | Impure | Search orchestration |
| 8 | Summary Service | `src/services/summary.ts` | Impure | AI-enhanced summaries |
| 9 | Migration Service | `src/services/migration.ts` | Impure | Import/export orchestration |
| 10 | MCP Tools | `src/mcp/tools/` | Impure | Tool handlers |
| 11 | ID Generation | `src/rules/ids.ts` | **Pure** | Global unique IDs |
| 12 | Format Versioning | `src/rules/format-version.ts` | **Pure** | Version detection |
| 13 | Sharing Transforms | `src/rules/sharing.ts` | **Pure** | Export/import transforms |
| 14 | Sharing Service | `src/services/sharing.ts` | Impure | Cross-repo sharing |
| 15 | Upgrade Service | `src/services/upgrade.ts` | Impure | Version upgrades |
| 16 | Sharing Tools | `src/mcp/tools/share.ts` | Impure | Export/import tools |

---

## Overview

This document specifies the **implementation architecture** for progressive disclosure in LoopFlow — a token-efficient retrieval system that scales as knowledge accumulates.

> **Note**: This spec defines the "brain" — how data is stored, queried, and retrieved. For the higher-level interaction model (how agents reason about and use these capabilities), see [FLUID-API-PARADIGM.md](./FLUID-API-PARADIGM.md). In persona terms: this spec is **the Curator's brain**; the Fluid API spec is **how you talk to the Curator**.

### Goals

1. **Token efficiency**: 60-80% reduction in context usage for search/retrieval
2. **Scalability**: Performant queries as insights grow from 50 → 5000+
3. **Testability**: Pure business logic separated from I/O
4. **Backward compatibility**: Seamless migration from JSON files

### Non-Goals

- Real-time sync (file watching)
- Multi-user concurrency
- Cloud/remote storage

### Additional Goals (v1.1)

5. **Migration paths**: Support all upgrade paths between LoopFlow versions
6. **Cross-repo sharing**: Export/import insights between repositories
7. **Globally unique IDs**: Prevent conflicts when sharing across repos

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server Layer                          │
│  (Tool handlers: loop_scan, loop_expand, loop_orient, etc.)     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      Service Layer                               │
│  (Orchestration: SearchService, SummaryService, TimelineService)│
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Business Rules Layer                          │
│  (Pure functions: scoring, filtering, summarization, migration) │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     Repository Layer                             │
│  (Data access: SQLite queries, JSON export)                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      Storage Layer                               │
│  (SQLite database, JSON file generation)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Purity | Dependencies |
|-------|---------------|--------|--------------|
| MCP Server | Protocol handling, request/response | Impure | Services |
| Services | Orchestration, composition | Impure | Rules, Repos |
| Business Rules | Domain logic, transformations | **Pure** | None |
| Repositories | Data access abstraction | Impure | Storage |
| Storage | Persistence | Impure | SQLite, FS |

**Key principle**: Business Rules are pure functions with no I/O. All side effects live at the boundaries (MCP handlers, repositories).

---

## Module Specifications

### Module 1: Database Schema (`src/db/schema.ts`)

#### Purpose
Define SQLite schema and migrations.

#### Schema

```sql
-- Core entities
CREATE TABLE insights (
  id TEXT PRIMARY KEY,           -- INS-001
  content TEXT NOT NULL,
  summary TEXT,                   -- Generated, nullable for migration
  context TEXT,                   -- 2-3 sentence expansion
  type TEXT NOT NULL,             -- process|domain|architecture|edge_case|technical
  status TEXT NOT NULL DEFAULT 'unprocessed',
  tags TEXT,                      -- JSON array as text
  links TEXT,                     -- JSON array of IDs
  source TEXT,                    -- JSON object
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,            -- LF-001
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT,                   -- Generated from [TYPE] + title
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT DEFAULT 'medium',
  depends_on TEXT,                -- JSON array of IDs
  acceptance_criteria TEXT,       -- JSON array
  test_file TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,            -- 2026-01-21-S15
  task_id TEXT,
  date TEXT NOT NULL,
  outcome TEXT,                   -- COMPLETE|PARTIAL|BLOCKED
  summary TEXT,
  learnings TEXT,                 -- Markdown text
  manual_qa TEXT,                 -- REQUIRED|NOT_REQUIRED
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE observations (
  id TEXT PRIMARY KEY,            -- OBS-001
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,             -- tool_call|file_edit|shell_command|user_prompt
  summary TEXT NOT NULL,
  context TEXT,                   -- JSON object with type-specific data
  session_id TEXT,
  full_data TEXT,                 -- JSON, full input/output for expansion
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Full-text search indexes
CREATE VIRTUAL TABLE insights_fts USING fts5(
  id, content, summary, tags,
  content='insights',
  content_rowid='rowid'
);

CREATE VIRTUAL TABLE tasks_fts USING fts5(
  id, title, description, summary,
  content='tasks',
  content_rowid='rowid'
);

-- Regular indexes
CREATE INDEX idx_insights_type ON insights(type);
CREATE INDEX idx_insights_status ON insights(status);
CREATE INDEX idx_insights_created ON insights(created_at);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_observations_timestamp ON observations(timestamp);
CREATE INDEX idx_observations_session ON observations(session_id);

-- Schema version tracking
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL,
  description TEXT
);
```

#### API Surface

```typescript
// src/db/schema.ts

export interface SchemaVersion {
  version: number;
  description: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

export const SCHEMA_VERSIONS: SchemaVersion[];

export function getCurrentVersion(db: Database): number;
export function migrateToLatest(db: Database): MigrationResult;
export function migrateToVersion(db: Database, targetVersion: number): MigrationResult;

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  migrationsApplied: number[];
  success: boolean;
  error?: string;
}
```

#### Test Cases

| Test | Why |
|------|-----|
| `migrateToLatest` on empty DB creates all tables | Verifies fresh install works |
| `migrateToLatest` is idempotent | Running twice shouldn't fail or duplicate |
| `migrateToVersion` can go forward | Incremental upgrades work |
| `migrateToVersion` can go backward | Rollback works (if we support it) |
| FTS triggers update on INSERT/UPDATE/DELETE | Search index stays in sync |

---

### Module 2: Repositories (`src/db/repositories/`)

#### Purpose
Data access abstraction. Each entity gets a repository.

#### API Surface

```typescript
// src/db/repositories/types.ts

export interface PaginationParams {
  limit?: number;      // Default 50, max 200
  offset?: number;     // For simple pagination
}

export interface DateRange {
  from?: string;       // ISO date
  to?: string;
}

export interface BaseEntity {
  created_at: string;
  updated_at: string;
}

// src/db/repositories/insights.ts

export interface InsightRecord extends BaseEntity {
  id: string;
  content: string;
  summary: string | null;
  context: string | null;
  type: InsightType;
  status: 'unprocessed' | 'discussed';
  tags: string[];
  links: string[];
  source: InsightSource | null;
  notes: string | null;
}

export interface InsightFilters {
  types?: InsightType[];
  statuses?: ('unprocessed' | 'discussed')[];
  tags?: string[];
  dateRange?: DateRange;
}

export interface InsightsRepository {
  findById(id: string): InsightRecord | null;
  findByIds(ids: string[]): InsightRecord[];
  findAll(filters?: InsightFilters, pagination?: PaginationParams): InsightRecord[];
  search(query: string, filters?: InsightFilters, pagination?: PaginationParams): InsightRecord[];
  insert(insight: Omit<InsightRecord, 'created_at' | 'updated_at'>): InsightRecord;
  update(id: string, changes: Partial<InsightRecord>): InsightRecord | null;
  delete(id: string): boolean;
  count(filters?: InsightFilters): number;
  getNextId(): string;
}

// src/db/repositories/tasks.ts

export interface TaskRecord extends BaseEntity {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
  depends_on: string[];
  acceptance_criteria: string[];
  test_file: string | null;
  notes: string | null;
}

export interface TaskFilters {
  statuses?: TaskStatus[];
  priorities?: ('high' | 'medium' | 'low')[];
  dateRange?: DateRange;
}

export interface TasksRepository {
  findById(id: string): TaskRecord | null;
  findByIds(ids: string[]): TaskRecord[];
  findAll(filters?: TaskFilters, pagination?: PaginationParams): TaskRecord[];
  search(query: string, filters?: TaskFilters, pagination?: PaginationParams): TaskRecord[];
  insert(task: Omit<TaskRecord, 'created_at' | 'updated_at'>): TaskRecord;
  update(id: string, changes: Partial<TaskRecord>): TaskRecord | null;
  delete(id: string): boolean;
  count(filters?: TaskFilters): number;
  getNextId(): string;
}

// src/db/repositories/sessions.ts

export interface SessionRecord extends BaseEntity {
  id: string;
  task_id: string | null;
  date: string;
  outcome: 'COMPLETE' | 'PARTIAL' | 'BLOCKED' | null;
  summary: string | null;
  learnings: string | null;
  manual_qa: 'REQUIRED' | 'NOT_REQUIRED' | null;
}

export interface SessionsRepository {
  findById(id: string): SessionRecord | null;
  findRecent(limit: number): SessionRecord[];
  findByTaskId(taskId: string): SessionRecord[];
  insert(session: Omit<SessionRecord, 'created_at'>): SessionRecord;
  update(id: string, changes: Partial<SessionRecord>): SessionRecord | null;
  count(): number;
}

// src/db/repositories/observations.ts

export interface ObservationRecord {
  id: string;
  timestamp: string;
  type: 'tool_call' | 'file_edit' | 'shell_command' | 'user_prompt';
  summary: string;
  context: Record<string, unknown> | null;
  session_id: string | null;
  full_data: Record<string, unknown> | null;
  created_at: string;
}

export interface ObservationFilters {
  types?: ObservationRecord['type'][];
  sessionId?: string;
  dateRange?: DateRange;
}

export interface ObservationsRepository {
  findById(id: string): ObservationRecord | null;
  findByIds(ids: string[]): ObservationRecord[];
  findAll(filters?: ObservationFilters, pagination?: PaginationParams): ObservationRecord[];
  findAroundTimestamp(timestamp: string, before: number, after: number): ObservationRecord[];
  insert(observation: Omit<ObservationRecord, 'created_at'>): ObservationRecord;
  count(filters?: ObservationFilters): number;
  getNextId(): string;
}
```

#### Test Cases

| Test | Why |
|------|-----|
| `insert` returns record with generated timestamps | Verify auto-fields work |
| `findById` returns null for nonexistent ID | Null handling is correct |
| `findByIds` returns records in ID order, skips missing | Batch fetch behavior |
| `search` matches content, summary, and tags | FTS integration works |
| `search` with filters combines FTS + SQL filters | Complex queries work |
| `findAll` with pagination respects limit/offset | Pagination works |
| `update` with nonexistent ID returns null | Error handling |
| `count` with filters returns correct count | Aggregation works |
| `getNextId` returns sequential ID | ID generation is correct |

---

### Module 3: Business Rules — Summarization (`src/rules/summarization.ts`)

#### Purpose
Pure functions for generating summaries from content.

#### API Surface

```typescript
// src/rules/summarization.ts

export interface SummarizationResult {
  summary: string;
  context: string | null;
  method: 'heuristic' | 'ai';
}

export interface SummarizationOptions {
  maxSummaryLength?: number;    // Default 100 chars
  maxContextLength?: number;    // Default 300 chars
  includeContext?: boolean;     // Default true
}

/**
 * Generate summary using heuristics (pure function).
 * 
 * Strategy:
 * 1. If content <= maxSummaryLength: summary = content
 * 2. If content has clear first sentence (ends with . ! ?): use it
 * 3. Otherwise: truncate at word boundary + "..."
 */
export function summarizeHeuristic(
  content: string,
  options?: SummarizationOptions
): SummarizationResult;

/**
 * Extract first sentence from text.
 * Returns null if no clear sentence boundary found.
 */
export function extractFirstSentence(text: string): string | null;

/**
 * Truncate text at word boundary.
 */
export function truncateAtWord(text: string, maxLength: number): string;

/**
 * Generate context (2-3 sentences) from content.
 */
export function extractContext(content: string, maxLength: number): string | null;

/**
 * Generate task summary from type prefix and title.
 * E.g., "[IMPL] Add search" -> "[IMPL] Add search"
 * Already concise, just validates format.
 */
export function summarizeTask(title: string, type?: string): string;
```

#### Test Cases

| Test | Why |
|------|-----|
| Short content (< max) returns content as summary | No truncation needed |
| Content with clear first sentence uses it | Sentence extraction works |
| Content without period truncates at word boundary | Graceful fallback |
| Truncation never cuts mid-word | Readable output |
| Truncation adds "..." only when truncated | Visual indicator |
| Unicode content handles correctly | Internationalization |
| Empty content returns empty summary | Edge case |
| Very long single word truncates with "..." | Edge case |
| Context extracts first paragraph | Context generation works |
| Task summary preserves type prefix | Task summaries correct |

---

### Module 4: Business Rules — Scoring (`src/rules/scoring.ts`)

#### Purpose
Pure functions for relevance scoring in search.

#### API Surface

```typescript
// src/rules/scoring.ts

export interface ScoredItem<T> {
  item: T;
  score: number;        // 0-1, higher is more relevant
  matchedFields: string[];
}

export interface ScoringOptions {
  fieldWeights?: Record<string, number>;  // Field name -> weight multiplier
  boostRecent?: boolean;                  // Boost recent items
  boostRecencyDays?: number;              // Days for recency boost (default 30)
}

/**
 * Score items against a search query.
 * Pure function - no DB access.
 */
export function scoreItems<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  searchableFields: (keyof T)[],
  options?: ScoringOptions
): ScoredItem<T>[];

/**
 * Calculate term frequency score for a field.
 */
export function termFrequencyScore(text: string, terms: string[]): number;

/**
 * Apply recency boost to a score.
 * Items within boostDays get up to 20% boost, linearly decaying.
 */
export function applyRecencyBoost(
  baseScore: number,
  itemDate: string,
  referenceDate: string,
  boostDays: number
): number;

/**
 * Normalize scores to 0-1 range.
 */
export function normalizeScores<T>(items: ScoredItem<T>[]): ScoredItem<T>[];

/**
 * Parse search query into terms.
 * Handles: quoted phrases, exclusions (-term), field prefixes (type:process)
 */
export function parseSearchQuery(query: string): ParsedQuery;

export interface ParsedQuery {
  terms: string[];
  phrases: string[];
  exclusions: string[];
  fieldFilters: Record<string, string>;
}
```

#### Test Cases

| Test | Why |
|------|-----|
| Single term matches return score > 0 | Basic matching works |
| Multiple term matches score higher | More matches = better |
| Exact phrase match scores highest | Phrase matching works |
| Non-matching items return score 0 | Filtering works |
| Field weights affect scores proportionally | Weighting works |
| Recency boost increases recent item scores | Boost works |
| Recency boost decays over time | Decay is correct |
| Scores normalized to 0-1 range | Normalization works |
| Empty query returns all items with score 0 | Edge case |
| Query parsing extracts quoted phrases | Phrase parsing works |
| Query parsing extracts exclusions (-term) | Exclusion parsing works |
| Query parsing extracts field filters | Filter parsing works |
| Case insensitive matching | UX expectation |

---

### Module 5: Business Rules — Migration (`src/rules/migration.ts`)

#### Purpose
Pure functions for transforming between data formats (JSON ↔ DB records).

#### API Surface

```typescript
// src/rules/migration.ts

// JSON file formats (as currently exist)
export interface JsonInsight {
  id: string;
  content: string;
  type: string;
  status: string;
  source?: { task?: string; session?: string; original_id?: string };
  tags?: string[];
  links?: string[];
  created: string;
  notes?: string;
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
  project: string;
  last_updated: string;
  notes?: string;
  tasks: JsonTask[];
}

export interface JsonInsightsFile {
  schema_version: string;
  description?: string;
  insights: JsonInsight[];
  link_types?: Record<string, string>;
}

/**
 * Transform JSON insight to DB record.
 * Generates summary if not present.
 */
export function jsonInsightToRecord(
  json: JsonInsight,
  generateSummary: (content: string) => SummarizationResult
): Omit<InsightRecord, 'created_at' | 'updated_at'>;

/**
 * Transform DB record to JSON insight.
 * For generating human-readable JSON files.
 */
export function recordToJsonInsight(record: InsightRecord): JsonInsight;

/**
 * Transform JSON task to DB record.
 */
export function jsonTaskToRecord(
  json: JsonTask,
  generateSummary: (title: string) => string
): Omit<TaskRecord, 'created_at' | 'updated_at'>;

/**
 * Transform DB record to JSON task.
 */
export function recordToJsonTask(record: TaskRecord): JsonTask;

/**
 * Parse progress.txt into session records.
 * Returns sessions in chronological order.
 */
export function parseProgressFile(content: string): Omit<SessionRecord, 'created_at'>[];

/**
 * Generate progress.txt content from session records.
 */
export function generateProgressFile(sessions: SessionRecord[]): string;

/**
 * Validate JSON insight structure.
 * Returns validation errors or empty array if valid.
 */
export function validateJsonInsight(json: unknown): ValidationError[];

/**
 * Validate JSON task structure.
 */
export function validateJsonTask(json: unknown): ValidationError[];

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}
```

#### Test Cases

| Test | Why |
|------|-----|
| `jsonInsightToRecord` maps all fields correctly | Data integrity |
| `jsonInsightToRecord` generates summary when missing | Migration generates summaries |
| `jsonInsightToRecord` handles missing optional fields | Graceful defaults |
| `recordToJsonInsight` produces valid JSON structure | Export works |
| Round-trip `json -> record -> json` preserves data | Bidirectional correctness |
| `parseProgressFile` extracts sessions from markdown | Progress parsing works |
| `parseProgressFile` handles various outcome formats | Robustness |
| `parseProgressFile` extracts learnings section | All data captured |
| `generateProgressFile` produces valid markdown | Export works |
| `validateJsonInsight` catches missing required fields | Validation works |
| `validateJsonInsight` catches invalid type values | Type checking works |
| `validateJsonTask` catches invalid status values | Enum validation works |

---

### Module 6: Business Rules — Filtering (`src/rules/filtering.ts`)

#### Purpose
Pure functions for filtering and combining filter predicates.

#### API Surface

```typescript
// src/rules/filtering.ts

export type Predicate<T> = (item: T) => boolean;

/**
 * Create predicate for insight type filter.
 */
export function insightTypePredicate(types: InsightType[]): Predicate<InsightRecord>;

/**
 * Create predicate for status filter.
 */
export function statusPredicate<T extends { status: string }>(
  statuses: string[]
): Predicate<T>;

/**
 * Create predicate for date range filter.
 */
export function dateRangePredicate<T extends { created_at: string }>(
  range: DateRange
): Predicate<T>;

/**
 * Create predicate for tag filter (any match).
 */
export function tagsPredicate(tags: string[]): Predicate<{ tags: string[] }>;

/**
 * Combine multiple predicates with AND logic.
 */
export function andPredicates<T>(...predicates: Predicate<T>[]): Predicate<T>;

/**
 * Combine multiple predicates with OR logic.
 */
export function orPredicates<T>(...predicates: Predicate<T>[]): Predicate<T>;

/**
 * Apply predicates to filter a list.
 */
export function applyFilters<T>(items: T[], predicate: Predicate<T>): T[];
```

#### Test Cases

| Test | Why |
|------|-----|
| `insightTypePredicate` matches specified types | Type filtering works |
| `insightTypePredicate` with empty array matches all | Edge case |
| `statusPredicate` matches specified statuses | Status filtering works |
| `dateRangePredicate` matches within range | Date filtering works |
| `dateRangePredicate` with only `from` filters correctly | Partial range |
| `dateRangePredicate` with only `to` filters correctly | Partial range |
| `tagsPredicate` matches if any tag matches | Tag filtering works |
| `andPredicates` requires all predicates true | AND logic |
| `orPredicates` requires any predicate true | OR logic |
| Empty predicate list returns always-true predicate | Edge case |

---

### Module 7: Services — Search Service (`src/services/search.ts`)

#### Purpose
Orchestrate search across repositories with scoring and progressive disclosure.

#### API Surface

```typescript
// src/services/search.ts

export interface ScanResult {
  id: string;
  kind: 'insight' | 'task' | 'observation';
  summary: string;
  relevance: number;
  date: string;
}

export interface ScanResponse {
  matches: ScanResult[];
  totalCount: number;
  truncated: boolean;
}

export interface ExpandedItem {
  id: string;
  kind: 'insight' | 'task' | 'observation';
  fullContent: InsightRecord | TaskRecord | ObservationRecord;
  linkedItems?: ScanResult[];
  timelineContext?: ScanResult[];
}

export interface ExpandResponse {
  items: ExpandedItem[];
  notFound: string[];
}

export interface SearchService {
  /**
   * Layer 1: Search and return compact index.
   */
  scan(params: {
    query: string;
    scope?: ('insights' | 'tasks' | 'observations')[];
    filters?: {
      types?: string[];
      statuses?: string[];
      tags?: string[];
      dateRange?: DateRange;
    };
    limit?: number;
  }): ScanResponse;

  /**
   * Layer 3: Expand specific items to full content.
   */
  expand(params: {
    ids: string[];
    includeLinks?: boolean;
    includeTimeline?: boolean;
  }): ExpandResponse;

  /**
   * Temporal context around a point.
   */
  timeline(params: {
    anchor: string | Date;
    depthBefore?: number;
    depthAfter?: number;
    scope?: ('insights' | 'tasks' | 'observations')[];
  }): ScanResult[];
}

export function createSearchService(
  insights: InsightsRepository,
  tasks: TasksRepository,
  observations: ObservationsRepository
): SearchService;
```

#### Test Cases

| Test | Why |
|------|-----|
| `scan` returns results sorted by relevance | Ranking works |
| `scan` respects limit parameter | Pagination works |
| `scan` sets truncated flag when more results exist | UX feedback |
| `scan` with scope filters to specified entity types | Scope filtering works |
| `scan` combines text search with filters | Complex queries work |
| `expand` returns full content for valid IDs | Expansion works |
| `expand` reports not found IDs separately | Error handling |
| `expand` with includeLinks fetches linked summaries | Link expansion works |
| `expand` with includeTimeline fetches temporal context | Timeline expansion works |
| `timeline` returns items before and after anchor | Timeline works |
| `timeline` respects depth parameters | Depth limiting works |

---

### Module 8: Services — Summary Service (`src/services/summary.ts`)

#### Purpose
Orchestrate summary generation with optional AI enhancement.

#### API Surface

```typescript
// src/services/summary.ts

export interface SummaryService {
  /**
   * Generate summary for content.
   * Uses heuristics by default, AI if available and beneficial.
   */
  summarize(content: string, options?: {
    forceMethod?: 'heuristic' | 'ai';
    type?: 'insight' | 'task' | 'observation';
  }): Promise<SummarizationResult>;

  /**
   * Batch summarize multiple items.
   * More efficient for AI method.
   */
  summarizeBatch(items: Array<{
    id: string;
    content: string;
    type?: string;
  }>): Promise<Map<string, SummarizationResult>>;

  /**
   * Check if AI summarization is available.
   */
  isAiAvailable(): Promise<boolean>;
}

export interface SummaryServiceConfig {
  ollamaEndpoint?: string;      // Default: http://localhost:11434
  ollamaModel?: string;         // Default: phi3
  aiThreshold?: number;         // Content length to trigger AI (default 200)
  enableAi?: boolean;           // Default: true (if Ollama available)
}

export function createSummaryService(config?: SummaryServiceConfig): SummaryService;
```

#### Test Cases

| Test | Why |
|------|-----|
| `summarize` short content uses heuristic | Efficiency |
| `summarize` long content attempts AI if available | AI enhancement |
| `summarize` falls back to heuristic on AI failure | Robustness |
| `summarize` respects forceMethod option | Override works |
| `summarizeBatch` processes all items | Batch works |
| `summarizeBatch` handles partial failures gracefully | Robustness |
| `isAiAvailable` returns false when Ollama not running | Detection works |
| `isAiAvailable` caches result for performance | Efficiency |

---

### Module 9: Services — Migration Service (`src/services/migration.ts`)

#### Purpose
Orchestrate migration from JSON files to SQLite and vice versa.

#### API Surface

```typescript
// src/services/migration.ts

export interface MigrationStats {
  insights: { imported: number; skipped: number; errors: number };
  tasks: { imported: number; skipped: number; errors: number };
  sessions: { imported: number; skipped: number; errors: number };
}

export interface ExportStats {
  insights: number;
  tasks: number;
  sessions: number;
}

export interface MigrationService {
  /**
   * Import from JSON files to SQLite.
   * Idempotent: skips existing records by ID.
   */
  importFromFiles(repoPath: string): Promise<{
    stats: MigrationStats;
    errors: ValidationError[];
  }>;

  /**
   * Export from SQLite to JSON files.
   * Overwrites existing files.
   */
  exportToFiles(repoPath: string): Promise<ExportStats>;

  /**
   * Check if migration is needed.
   * Returns true if JSON files exist but DB is empty/outdated.
   */
  needsMigration(repoPath: string): Promise<boolean>;

  /**
   * Get current data source.
   */
  getDataSource(repoPath: string): Promise<'json' | 'sqlite' | 'both' | 'none'>;
}

export function createMigrationService(
  db: Database,
  summaryService: SummaryService
): MigrationService;
```

#### Test Cases

| Test | Why |
|------|-----|
| `importFromFiles` creates records from JSON | Import works |
| `importFromFiles` generates summaries for insights | Summary generation on import |
| `importFromFiles` skips existing IDs (idempotent) | Re-import safety |
| `importFromFiles` reports errors for invalid data | Error reporting |
| `importFromFiles` handles missing files gracefully | Robustness |
| `exportToFiles` creates valid JSON files | Export works |
| `exportToFiles` preserves all data fields | Data integrity |
| `needsMigration` returns true for JSON-only state | Detection works |
| `needsMigration` returns false when DB is populated | Detection works |
| `getDataSource` correctly identifies state | State detection works |

---

### Module 10: MCP Tools (`src/mcp/tools/`)

#### Purpose
MCP tool handlers that compose services.

#### API Surface

```typescript
// src/mcp/tools/scan.ts

export interface LoopScanParams {
  query: string;
  scope?: ('insights' | 'tasks' | 'observations')[];
  filters?: {
    types?: string[];
    statuses?: string[];
    tags?: string[];
    dateRange?: { from?: string; to?: string };
  };
  limit?: number;
}

export function createLoopScanTool(searchService: SearchService): McpTool;

// src/mcp/tools/expand.ts

export interface LoopExpandParams {
  ids: string[];
  includeLinks?: boolean;
  includeTimeline?: boolean;
}

export function createLoopExpandTool(searchService: SearchService): McpTool;

// src/mcp/tools/timeline.ts

export interface LoopTimelineParams {
  anchor: string;
  depthBefore?: number;
  depthAfter?: number;
  scope?: ('insights' | 'tasks' | 'observations')[];
}

export function createLoopTimelineTool(searchService: SearchService): McpTool;
```

#### Test Cases

| Test | Why |
|------|-----|
| Tool validates required parameters | Input validation |
| Tool returns well-formed MCP response | Protocol compliance |
| Tool handles service errors gracefully | Error handling |
| Tool respects parameter defaults | Default behavior |

---

### Module 11: Business Rules — ID Generation (`src/rules/ids.ts`)

#### Purpose
Pure functions for generating globally unique IDs that prevent conflicts in cross-repo sharing.

#### ID Format

```
INS-{timestamp}-{random}
INS-20260121-a1b2c3

LF-{timestamp}-{random}
LF-20260121-x9y8z7

OBS-{timestamp}-{random}
OBS-20260121-p4q5r6

SES-{timestamp}-{random}
SES-20260121-m7n8o9
```

**Design rationale**:
- **Timestamp prefix**: Provides natural chronological sorting
- **Random suffix**: Ensures uniqueness even for same-millisecond creation
- **Entity prefix**: Makes IDs self-describing (INS = insight, LF = task, etc.)
- **Human readable**: Unlike UUIDs, can be spoken/remembered
- **Collision resistant**: 6 alphanumeric chars = 2.1 billion combinations per timestamp

#### API Surface

```typescript
// src/rules/ids.ts

export type EntityType = 'insight' | 'task' | 'observation' | 'session';

export interface IdComponents {
  type: EntityType;
  timestamp: string;    // YYYYMMDD format
  random: string;       // 6 alphanumeric chars
}

/**
 * Generate a new globally unique ID.
 * Pure when given explicit timestamp and random source.
 */
export function generateId(
  type: EntityType,
  timestamp?: Date,
  randomSource?: () => string
): string;

/**
 * Parse an ID into its components.
 * Returns null for invalid/legacy IDs.
 */
export function parseId(id: string): IdComponents | null;

/**
 * Check if an ID is in the new global format.
 */
export function isGlobalId(id: string): boolean;

/**
 * Check if an ID is in legacy format (INS-001, LF-042).
 */
export function isLegacyId(id: string): boolean;

/**
 * Migrate a legacy ID to global format.
 * Preserves the original ID in a deterministic way for idempotency.
 */
export function migrateLegacyId(
  legacyId: string,
  createdDate: string,
  repoHash: string
): string;

/**
 * Generate a short hash from repo path for namespacing.
 */
export function repoHash(repoPath: string): string;

/**
 * Get the entity type prefix for an entity type.
 */
export function getPrefix(type: EntityType): string;
```

#### Test Cases

| Test | Why |
|------|-----|
| `generateId` produces valid format | Format correctness |
| `generateId` is unique across calls | Uniqueness |
| `generateId` with same timestamp produces different IDs | Random suffix works |
| `parseId` extracts correct components | Parsing works |
| `parseId` returns null for invalid format | Validation works |
| `isGlobalId` returns true for new format | Detection works |
| `isLegacyId` returns true for INS-001 format | Legacy detection |
| `migrateLegacyId` is deterministic (same input = same output) | Idempotency |
| `migrateLegacyId` produces valid global ID | Migration correctness |
| `repoHash` produces consistent hash for same path | Determinism |
| `repoHash` produces different hash for different paths | Uniqueness |

---

### Module 12: Business Rules — Format Versioning (`src/rules/format-version.ts`)

#### Purpose
Pure functions for detecting and handling different LoopFlow data format versions.

#### Format Versions

| Version | Era | Characteristics |
|---------|-----|-----------------|
| `0.x` | Pre-MCP | `.loop-flow/plan/` with sequential IDs, no summaries |
| `1.0` | MCP File | `.loop-flow/plan/` with global IDs, summaries in JSON |
| `2.0` | MCP SQLite | `loopflow.db` as source of truth, JSON as views |

#### API Surface

```typescript
// src/rules/format-version.ts

export type FormatVersion = '0.x' | '1.0' | '2.0' | 'unknown';

export interface FormatDetectionResult {
  version: FormatVersion;
  indicators: string[];      // What we found that indicates this version
  canUpgrade: boolean;
  upgradePath?: FormatVersion[];  // e.g., ['0.x', '1.0', '2.0']
}

export interface InsightsFileV0 {
  schema_version?: string;   // May be missing in very old files
  insights: Array<{
    id: string;              // INS-001 format
    content: string;
    type: string;
    // ... no summary field
  }>;
}

export interface InsightsFileV1 {
  schema_version: string;    // "1.0.0"
  insights: Array<{
    id: string;              // INS-20260121-a1b2c3 format
    content: string;
    summary: string;
    // ...
  }>;
}

/**
 * Detect format version from file contents.
 */
export function detectInsightsVersion(content: unknown): FormatDetectionResult;

/**
 * Detect format version from backlog contents.
 */
export function detectBacklogVersion(content: unknown): FormatDetectionResult;

/**
 * Detect overall repo format from available files.
 */
export function detectRepoFormat(files: {
  hasInsightsJson: boolean;
  hasBacklogJson: boolean;
  hasProgressTxt: boolean;
  hasLoopflowDb: boolean;
  insightsContent?: unknown;
  backlogContent?: unknown;
}): FormatDetectionResult;

/**
 * Get the upgrade path between two versions.
 */
export function getUpgradePath(from: FormatVersion, to: FormatVersion): FormatVersion[];

/**
 * Check if a direct upgrade is possible (vs. multi-step).
 */
export function canDirectUpgrade(from: FormatVersion, to: FormatVersion): boolean;
```

#### Test Cases

| Test | Why |
|------|-----|
| `detectInsightsVersion` identifies v0.x by sequential IDs | Version detection |
| `detectInsightsVersion` identifies v1.0 by global IDs | Version detection |
| `detectInsightsVersion` identifies v0.x by missing summaries | Version detection |
| `detectBacklogVersion` identifies versions correctly | Backlog detection |
| `detectRepoFormat` with only JSON files returns correct version | Repo detection |
| `detectRepoFormat` with SQLite returns v2.0 | Repo detection |
| `getUpgradePath` returns correct steps for 0.x → 2.0 | Path planning |
| `getUpgradePath` returns empty for same version | Edge case |
| `canDirectUpgrade` returns false for 0.x → 2.0 | Multi-step required |
| `canDirectUpgrade` returns true for 1.0 → 2.0 | Direct possible |

---

### Module 13: Business Rules — Export/Import Transforms (`src/rules/sharing.ts`)

#### Purpose
Pure functions for creating shareable insight bundles and merging them into a repo.

#### Export Bundle Format

```typescript
interface InsightBundle {
  version: '1.0';
  exported_at: string;           // ISO timestamp
  source_repo: {
    name: string;                // From package.json or folder name
    hash: string;                // Short hash for reference
  };
  insights: ExportedInsight[];
  metadata: {
    total_count: number;
    export_reason?: string;      // Optional note from exporter
  };
}

interface ExportedInsight {
  // Original data (preserved)
  original_id: string;
  content: string;
  summary: string;
  type: InsightType;
  status: 'unprocessed' | 'discussed';
  tags: string[];
  links: string[];               // References original IDs
  source: InsightSource | null;
  notes: string | null;
  created: string;
  
  // Export metadata (added)
  exported_from_repo: string;    // Repo hash
  content_hash: string;          // For deduplication
}
```

#### API Surface

```typescript
// src/rules/sharing.ts

export interface ExportOptions {
  includeLinks?: boolean;        // Include linked insights (default true)
  filterByTags?: string[];       // Only export matching tags
  filterByType?: InsightType[];  // Only export matching types
  exportReason?: string;         // Note to include in bundle
}

export interface ExportResult {
  bundle: InsightBundle;
  includedIds: string[];
  excludedIds: string[];         // Due to filters
  linkedIdsAdded: string[];      // Added because of links
}

/**
 * Create an export bundle from insights.
 * Pure function - transforms data, no I/O.
 */
export function createExportBundle(
  insights: InsightRecord[],
  repoName: string,
  repoHash: string,
  options?: ExportOptions
): ExportResult;

/**
 * Generate content hash for deduplication.
 * Same content = same hash, regardless of ID or metadata.
 */
export function hashInsightContent(content: string): string;

export interface ImportPreview {
  newInsights: ExportedInsight[];           // Will be imported as new
  duplicates: Array<{                        // Already exist (by content hash)
    imported: ExportedInsight;
    existing: InsightRecord;
  }>;
  conflicts: Array<{                         // Same ID, different content
    imported: ExportedInsight;
    existing: InsightRecord;
  }>;
  linksMappable: boolean;                    // Can we resolve all links?
  unmappableLinks: string[];                 // Links that can't be resolved
}

/**
 * Preview what would happen if we imported a bundle.
 * Pure function - no side effects.
 */
export function previewImport(
  bundle: InsightBundle,
  existingInsights: InsightRecord[],
  targetRepoHash: string
): ImportPreview;

export interface ImportPlan {
  insightsToCreate: Array<{
    newId: string;                // Generated for target repo
    data: Omit<InsightRecord, 'created_at' | 'updated_at'>;
    originalId: string;           // For reference
  }>;
  linkRemapping: Map<string, string>;  // original ID -> new ID
  skippedDuplicates: string[];
  skippedConflicts: string[];
}

/**
 * Create an import plan from a preview.
 * Generates new IDs, remaps links.
 */
export function createImportPlan(
  preview: ImportPreview,
  targetRepoHash: string,
  generateId: (type: EntityType) => string
): ImportPlan;

/**
 * Apply link remapping to insight links.
 */
export function remapLinks(
  links: string[],
  remapping: Map<string, string>
): string[];

/**
 * Validate a bundle structure.
 */
export function validateBundle(bundle: unknown): ValidationError[];
```

#### Test Cases

| Test | Why |
|------|-----|
| `createExportBundle` includes all insights when no filter | Basic export |
| `createExportBundle` respects tag filter | Filtering works |
| `createExportBundle` respects type filter | Filtering works |
| `createExportBundle` includes linked insights when enabled | Link following |
| `createExportBundle` excludes linked insights when disabled | Option respected |
| `hashInsightContent` same content = same hash | Deduplication |
| `hashInsightContent` different content = different hash | Differentiation |
| `hashInsightContent` ignores whitespace differences | Normalization |
| `previewImport` identifies new insights | New detection |
| `previewImport` identifies duplicates by content hash | Dedup detection |
| `previewImport` identifies ID conflicts | Conflict detection |
| `previewImport` reports unmappable links | Link analysis |
| `createImportPlan` generates new IDs for all imports | ID generation |
| `createImportPlan` remaps links to new IDs | Link remapping |
| `createImportPlan` skips duplicates | Dedup respected |
| `remapLinks` handles missing mappings gracefully | Robustness |
| `validateBundle` catches missing required fields | Validation |
| `validateBundle` catches invalid version | Version check |

---

### Module 14: Services — Sharing Service (`src/services/sharing.ts`)

#### Purpose
Orchestrate export and import of insight bundles with user confirmation.

#### API Surface

```typescript
// src/services/sharing.ts

export interface SharingService {
  /**
   * Export insights to a bundle file.
   */
  exportToFile(params: {
    outputPath: string;
    insightIds?: string[];       // Specific IDs, or all if omitted
    options?: ExportOptions;
  }): Promise<{
    bundlePath: string;
    stats: ExportResult;
  }>;

  /**
   * Preview importing a bundle file.
   * Returns what would happen, doesn't modify anything.
   */
  previewImportFromFile(bundlePath: string): Promise<ImportPreview>;

  /**
   * Execute import after user confirmation.
   */
  executeImport(params: {
    bundlePath: string;
    skipDuplicates?: boolean;    // Default true
    skipConflicts?: boolean;     // Default true
    selectedIds?: string[];      // Import only these (from preview)
  }): Promise<{
    imported: number;
    skipped: number;
    errors: ValidationError[];
  }>;
}

export function createSharingService(
  insightsRepo: InsightsRepository,
  summaryService: SummaryService,
  repoPath: string
): SharingService;
```

#### Test Cases

| Test | Why |
|------|-----|
| `exportToFile` creates valid JSON file | File creation |
| `exportToFile` with specific IDs only exports those | Selective export |
| `exportToFile` respects export options | Options work |
| `previewImportFromFile` reads and parses bundle | File reading |
| `previewImportFromFile` returns accurate preview | Preview accuracy |
| `executeImport` creates new insights | Import works |
| `executeImport` skips duplicates when configured | Dedup works |
| `executeImport` skips conflicts when configured | Conflict handling |
| `executeImport` with selectedIds only imports those | Selective import |
| `executeImport` generates summaries for imported insights | Summary generation |

---

### Module 15: Services — Upgrade Service (`src/services/upgrade.ts`)

#### Purpose
Orchestrate multi-step upgrades between LoopFlow format versions.

#### API Surface

```typescript
// src/services/upgrade.ts

export interface UpgradeStep {
  from: FormatVersion;
  to: FormatVersion;
  description: string;
  estimatedItems?: number;
}

export interface UpgradeProgress {
  currentStep: number;
  totalSteps: number;
  currentStepDescription: string;
  itemsProcessed: number;
  totalItems: number;
}

export interface UpgradeResult {
  success: boolean;
  fromVersion: FormatVersion;
  toVersion: FormatVersion;
  stepsCompleted: number;
  insights: { migrated: number; errors: number };
  tasks: { migrated: number; errors: number };
  sessions: { migrated: number; errors: number };
  errors: ValidationError[];
  backupPath?: string;
}

export interface UpgradeService {
  /**
   * Detect current format and available upgrades.
   */
  detectFormat(repoPath: string): Promise<FormatDetectionResult>;

  /**
   * Get the steps required for an upgrade.
   */
  planUpgrade(repoPath: string, targetVersion?: FormatVersion): Promise<UpgradeStep[]>;

  /**
   * Execute upgrade with progress callbacks.
   */
  executeUpgrade(params: {
    repoPath: string;
    targetVersion?: FormatVersion;  // Default: latest (2.0)
    createBackup?: boolean;         // Default: true
    onProgress?: (progress: UpgradeProgress) => void;
  }): Promise<UpgradeResult>;

  /**
   * Rollback to backup if upgrade failed.
   */
  rollback(repoPath: string, backupPath: string): Promise<boolean>;
}

export function createUpgradeService(
  migrationService: MigrationService,
  summaryService: SummaryService
): UpgradeService;
```

#### Upgrade Paths

```
┌─────────────────────────────────────────────────────────────┐
│                     Upgrade Flow                             │
└─────────────────────────────────────────────────────────────┘

  v0.x (Pre-MCP)                     v1.0 (MCP File)                    v2.0 (MCP SQLite)
  ┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
  │ Sequential  │  ─── Step 1 ───>  │ Global IDs  │  ─── Step 2 ───>  │ SQLite DB   │
  │ IDs         │  Migrate IDs      │ Summaries   │  Import to DB     │ JSON views  │
  │ No summaries│  Add summaries    │ in JSON     │                   │             │
  └─────────────┘                    └─────────────┘                    └─────────────┘
        │                                                                     │
        └─────────────────── Step 1+2 (combined) ────────────────────────────┘

Step 1: v0.x → v1.0
  - Migrate INS-001 → INS-{date}-{rand} (deterministic based on created date + repo)
  - Generate summaries for all insights
  - Update insights.json schema_version to "1.0.0"
  - Update backlog.json with new task IDs

Step 2: v1.0 → v2.0
  - Create loopflow.db with schema
  - Import insights, tasks, sessions from JSON
  - JSON files become generated views
```

#### Test Cases

| Test | Why |
|------|-----|
| `detectFormat` identifies v0.x correctly | Detection |
| `detectFormat` identifies v1.0 correctly | Detection |
| `detectFormat` identifies v2.0 correctly | Detection |
| `planUpgrade` returns correct steps for 0.x → 2.0 | Planning |
| `planUpgrade` returns empty for already latest | Edge case |
| `executeUpgrade` 0.x → 1.0 migrates IDs | ID migration |
| `executeUpgrade` 0.x → 1.0 generates summaries | Summary generation |
| `executeUpgrade` 1.0 → 2.0 creates database | DB creation |
| `executeUpgrade` 1.0 → 2.0 imports all data | Data import |
| `executeUpgrade` creates backup when configured | Backup safety |
| `executeUpgrade` reports progress via callback | Progress tracking |
| `executeUpgrade` 0.x → 2.0 chains both steps | Multi-step |
| `rollback` restores from backup | Rollback works |
| Upgrade is idempotent (running twice is safe) | Idempotency |

---

### Module 16: MCP Tools — Sharing (`src/mcp/tools/share.ts`)

#### Purpose
MCP tools for exporting and importing insight bundles.

#### API Surface

```typescript
// src/mcp/tools/share.ts

export interface LoopExportParams {
  output_path?: string;          // Default: .loop-flow/exports/{timestamp}.json
  insight_ids?: string[];        // Specific IDs, or all if omitted
  tags?: string[];               // Filter by tags
  types?: InsightType[];         // Filter by types
  include_links?: boolean;       // Default true
  reason?: string;               // Note to include in export
}

export interface LoopExportResult {
  bundle_path: string;
  insights_exported: number;
  linked_insights_added: number;
  message: string;
}

export function createLoopExportTool(sharingService: SharingService): McpTool;

export interface LoopImportPreviewParams {
  bundle_path: string;
}

export interface LoopImportPreviewResult {
  new_insights: number;
  duplicates: number;
  conflicts: number;
  source_repo: string;
  exported_at: string;
  insights: Array<{
    original_id: string;
    summary: string;
    status: 'new' | 'duplicate' | 'conflict';
  }>;
  recommendation: string;
}

export function createLoopImportPreviewTool(sharingService: SharingService): McpTool;

export interface LoopImportParams {
  bundle_path: string;
  selected_ids?: string[];       // Import only these (from preview)
  skip_duplicates?: boolean;     // Default true
  skip_conflicts?: boolean;      // Default true
}

export interface LoopImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  message: string;
}

export function createLoopImportTool(sharingService: SharingService): McpTool;
```

#### Test Cases

| Test | Why |
|------|-----|
| `loop_export` creates bundle file | Export works |
| `loop_export` with filters exports subset | Filtering works |
| `loop_import_preview` returns accurate summary | Preview works |
| `loop_import` creates insights | Import works |
| `loop_import` with selected_ids imports subset | Selective import |

---

## Data Flow Diagrams

### Search Flow (Progressive Disclosure)

```
Agent                    MCP Server              SearchService           Repository
  │                          │                        │                      │
  │  loop_scan(query)        │                        │                      │
  ├─────────────────────────>│                        │                      │
  │                          │  scan(params)          │                      │
  │                          ├───────────────────────>│                      │
  │                          │                        │  search(query)       │
  │                          │                        ├─────────────────────>│
  │                          │                        │<─────────────────────┤
  │                          │                        │  (raw records)       │
  │                          │                        │                      │
  │                          │                        │ [score & rank]       │
  │                          │                        │ [truncate to limit]  │
  │                          │<───────────────────────┤                      │
  │  ScanResponse            │  (summaries only)      │                      │
  │<─────────────────────────┤                        │                      │
  │                          │                        │                      │
  │  [Agent reviews summaries, picks IDs]             │                      │
  │                          │                        │                      │
  │  loop_expand(ids)        │                        │                      │
  ├─────────────────────────>│                        │                      │
  │                          │  expand(ids)           │                      │
  │                          ├───────────────────────>│                      │
  │                          │                        │  findByIds(ids)      │
  │                          │                        ├─────────────────────>│
  │                          │                        │<─────────────────────┤
  │                          │<───────────────────────┤  (full records)      │
  │  ExpandResponse          │                        │                      │
  │<─────────────────────────┤                        │                      │
```

### Migration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     On First MCP Tool Call                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ needsMigration? │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │ yes                         │ no
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ importFromFiles │           │  Use existing   │
    │                 │           │  SQLite data    │
    │ - Read JSON     │           └─────────────────┘
    │ - Validate      │
    │ - Summarize     │
    │ - Insert to DB  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Continue with   │
    │ tool execution  │
    └─────────────────┘
```

---

## File Structure

```
src/
├── db/
│   ├── schema.ts              # Schema definitions and migrations
│   ├── connection.ts          # SQLite connection management
│   └── repositories/
│       ├── types.ts           # Shared repository types
│       ├── insights.ts        # Insights repository
│       ├── tasks.ts           # Tasks repository
│       ├── sessions.ts        # Sessions repository
│       └── observations.ts    # Observations repository
├── rules/
│   ├── summarization.ts       # Summary generation (pure)
│   ├── scoring.ts             # Relevance scoring (pure)
│   ├── filtering.ts           # Filter predicates (pure)
│   ├── migration.ts           # Format transformation (pure)
│   ├── ids.ts                 # Global ID generation (pure)
│   ├── format-version.ts      # Version detection (pure)
│   └── sharing.ts             # Export/import transforms (pure)
├── services/
│   ├── search.ts              # Search orchestration
│   ├── summary.ts             # Summary service with AI
│   ├── migration.ts           # Migration orchestration
│   ├── sharing.ts             # Export/import orchestration
│   └── upgrade.ts             # Version upgrade orchestration
├── mcp/
│   ├── server.ts              # MCP server setup
│   └── tools/
│       ├── scan.ts            # loop_scan tool
│       ├── expand.ts          # loop_expand tool
│       ├── timeline.ts        # loop_timeline tool
│       ├── export.ts          # loop_export tool
│       ├── import-preview.ts  # loop_import_preview tool
│       ├── import.ts          # loop_import tool
│       ├── orient.ts          # loop_orient (retrofitted)
│       ├── connect.ts         # loop_connect (retrofitted)
│       ├── remember.ts        # loop_remember (retrofitted)
│       ├── probe.ts           # loop_probe (unchanged)
│       └── handoff.ts         # loop_handoff (unchanged)
└── __tests__/
    ├── rules/
    │   ├── summarization.test.ts
    │   ├── scoring.test.ts
    │   ├── filtering.test.ts
    │   ├── migration.test.ts
    │   ├── ids.test.ts
    │   ├── format-version.test.ts
    │   └── sharing.test.ts
    ├── services/
    │   ├── search.test.ts
    │   ├── summary.test.ts
    │   ├── migration.test.ts
    │   ├── sharing.test.ts
    │   └── upgrade.test.ts
    └── integration/
        ├── mcp-tools.test.ts
        ├── upgrade-paths.test.ts
        └── full-workflow.test.ts
```

---

## Implementation Order

### Sprint 1: Foundation (Estimated: 1-2 sessions)
1. `src/db/schema.ts` — Schema and migrations
2. `src/db/connection.ts` — Connection management
3. `src/rules/migration.ts` — JSON ↔ Record transformations
4. `src/rules/ids.ts` — Global ID generation
5. Tests for all above

### Sprint 2: Repositories (Estimated: 1-2 sessions)
1. `src/db/repositories/types.ts` — Shared types
2. `src/db/repositories/insights.ts` — Insights repo
3. `src/db/repositories/tasks.ts` — Tasks repo
4. `src/db/repositories/sessions.ts` — Sessions repo
5. Tests for all repos

### Sprint 3: Business Rules (Estimated: 1-2 sessions)
1. `src/rules/summarization.ts` — Summary generation
2. `src/rules/scoring.ts` — Relevance scoring
3. `src/rules/filtering.ts` — Filter predicates
4. `src/rules/format-version.ts` — Version detection
5. Tests for all rules

### Sprint 4: Services (Estimated: 1-2 sessions)
1. `src/services/summary.ts` — Summary service
2. `src/services/migration.ts` — Migration service
3. `src/services/search.ts` — Search service
4. Tests for all services

### Sprint 5: MCP Tools (Estimated: 1-2 sessions)
1. `src/mcp/tools/scan.ts` — loop_scan
2. `src/mcp/tools/expand.ts` — loop_expand
3. `src/mcp/tools/timeline.ts` — loop_timeline
4. Retrofit existing tools
5. Integration tests

### Sprint 6: Upgrade System (Estimated: 1-2 sessions)
1. `src/services/upgrade.ts` — Upgrade orchestration
2. Integration: v0.x → v1.0 → v2.0 paths
3. Backup and rollback
4. Tests for all upgrade paths

### Sprint 7: Sharing System (Estimated: 1-2 sessions)
1. `src/rules/sharing.ts` — Export/import transforms
2. `src/services/sharing.ts` — Sharing orchestration
3. `src/mcp/tools/export.ts` — loop_export
4. `src/mcp/tools/import-preview.ts` — loop_import_preview
5. `src/mcp/tools/import.ts` — loop_import
6. Tests for sharing workflows

### Sprint 8: Observations (Estimated: 1 session, deferred)
1. `src/db/repositories/observations.ts`
2. `loop_observe` tool
3. Integration with scan/timeline

---

## Appendix: Token Budget Analysis

| Operation | Current (Full) | Progressive | Savings |
|-----------|---------------|-------------|---------|
| Orient (5 insights) | ~2500 tokens | ~500 tokens | 80% |
| Connect (10 matches) | ~5000 tokens | ~600 + expand 3 = ~1800 | 64% |
| Scan (20 matches) | ~10000 tokens | ~1000 + expand 5 = ~3500 | 65% |

---

## Appendix: DSPy Integration (Future Spike)

Potential DSPy signatures for AI-powered features:

```python
class SummarizeInsight(dspy.Signature):
    """Summarize a technical insight into one sentence."""
    content: str = dspy.InputField()
    insight_type: str = dspy.InputField()
    summary: str = dspy.OutputField(desc="Max 15 words")

class ScoreRelevance(dspy.Signature):
    """Score how relevant an insight is to a query."""
    query: str = dspy.InputField()
    insight_summary: str = dspy.InputField()
    insight_content: str = dspy.InputField()
    relevance: float = dspy.OutputField(desc="0-1 score")
    reasoning: str = dspy.OutputField()
```

Integration would require Python subprocess or HTTP service.

---

## Changelog

- **v1.1** (2026-01-21): Added Modules 11-16 for ID generation, format versioning, upgrade paths, and cross-repo sharing
- **v1.0** (2026-01-21): Initial specification
