/**
 * Loop-Flow Type Definitions
 */

// =============================================================================
// Task Types
// =============================================================================

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "NEEDS_QA"
  | "QA_PASSED"
  | "BLOCKED";

export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id: string;
  repoId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependsOn: string[];
  acceptanceCriteria: string[];
  notes?: string;
  testFile?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateTaskInput {
  id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dependsOn?: string[];
  acceptanceCriteria?: string[];
  notes?: string;
}

// =============================================================================
// Learning Types
// =============================================================================

export type LearningType =
  | "edge_case"
  | "domain"
  | "pattern"
  | "decision"
  | "gotcha";

export interface Learning {
  id: string;
  repoId: string;
  sessionId?: string;
  taskId?: string;
  type: LearningType;
  content: string;
  tags: string[];
  createdAt: Date;
}

export interface CreateLearningInput {
  type: LearningType;
  content: string;
  tags?: string[];
  taskId?: string;
}

// =============================================================================
// Session Types
// =============================================================================

export type SessionOutcome = "complete" | "blocked" | "partial";

export interface Session {
  id: string;
  repoId: string;
  taskId?: string;
  sessionNumber: number;
  startedAt: Date;
  endedAt?: Date;
  outcome?: SessionOutcome;
  notes?: string;
  needsQA: boolean;
}

export interface EndSessionInput {
  taskId: string;
  outcome: SessionOutcome;
  notes: string;
  learnings?: CreateLearningInput[];
  needsQA?: boolean;
}

// =============================================================================
// Repository Types
// =============================================================================

export interface Repo {
  id: string;
  path: string;
  name: string;
  agentsMdPath?: string;
  createdAt: Date;
  lastSessionAt?: Date;
}

export interface InitRepoInput {
  path: string;
  name?: string;
  template?: "generic" | "nextjs" | "python" | "go";
  createAgentsMd?: boolean;
}

// =============================================================================
// MCP Response Types
// =============================================================================

export interface StartSessionResponse {
  repo: {
    id: string;
    name: string;
    path: string;
  };
  currentTask: Task | null;
  suggestedTask: Task | null;
  recentLearnings: Learning[];
  sessionNumber: number;
  rulesDigest: string;
}

export interface EndSessionResponse {
  success: boolean;
  sessionId: string;
}

export interface TaskWithContext {
  task: Task;
  dependencies: Task[];
  relatedLearnings: Learning[];
}
