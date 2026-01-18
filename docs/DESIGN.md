# Loop-Flow Design Document

> An MCP server for structured AI-assisted development workflows.

---

## Vision

Loop-Flow solves the problem of **context rot** in AI-assisted development. When working with AI agents across multiple sessions:

1. **Context is lost** - Each new session starts from scratch
2. **Workflow files grow unbounded** - Eventually scaffolding alone fills the context window
3. **Learnings disappear** - Insights discovered in one session aren't available in the next
4. **Multi-repo work is fragmented** - No unified view across projects

Loop-Flow provides a **database-backed MCP server** that:
- Serves only the context the AI needs (not entire file dumps)
- Preserves learnings and decisions across sessions
- Manages tasks with proper dependency tracking
- Supports multiple repositories from a single server
- Enables team knowledge sharing (future)

---

## Core Concepts

### 1. The Loop

A **Loop** is a single focused work session:
- Starts with `loop.start()` - AI receives minimal context
- Ends with `loop.end()` - AI records outcomes and learnings
- One task per loop (atomic, completable)
- No context compaction - if task is too big, break it down

### 2. The Repository

A **Repository** is a codebase being managed:
- Has its own task backlog
- Has its own learnings/progress history
- Can reference a root `AGENTS.md` for team rules
- Multiple repos managed by one Loop-Flow instance

### 3. Learnings

**Learnings** are first-class entities, not just log entries:
- Tagged by topic, task, or domain
- Searchable across repos
- Can be surfaced when relevant context is detected
- Persist across sessions

### 4. Context Economy

Every API response is designed for **minimal context consumption**:
- `loop.start()` returns a focused summary, not raw files
- `loop.getContext(topic)` returns only relevant learnings
- `loop.suggestTask()` returns one recommendation, not the entire backlog
- Export commands generate human-readable files on-demand

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Loop-Flow MCP Server                  │
├─────────────────────────────────────────────────────────────┤
│  MCP Protocol Layer (stdio/HTTP)                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Tools: loop.start, loop.end, task.*, learning.*        ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ LoopService  │ │ TaskService  │ │ LearningService      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (SQLite)                                         │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  repos | tasks | learnings | sessions | config          ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
   ~/.loop-flow/                          ~/projects/my-app/
   └── loop-flow.db                       ├── AGENTS.md
                                          └── .loopflow (optional marker)
```

### Data Model

```
┌─────────────────┐       ┌─────────────────┐
│     repos       │       │     tasks       │
├─────────────────┤       ├─────────────────┤
│ id              │──────<│ repo_id         │
│ path            │       │ id (prefixed)   │
│ name            │       │ title           │
│ agents_md_path  │       │ description     │
│ created_at      │       │ status          │
│ last_session    │       │ priority        │
└─────────────────┘       │ depends_on[]    │
         │                │ acceptance[]    │
         │                │ notes           │
         │                │ created_at      │
         │                │ completed_at    │
         │                └─────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐
│    sessions     │       │   learnings     │
├─────────────────┤       ├─────────────────┤
│ id              │──────<│ session_id      │
│ repo_id         │       │ repo_id         │
│ task_id         │       │ task_id (opt)   │
│ started_at      │       │ type            │
│ ended_at        │       │ content         │
│ outcome         │       │ tags[]          │
│ notes           │       │ created_at      │
└─────────────────┘       └─────────────────┘
```

### Learning Types

| Type | Description | Example |
|------|-------------|---------|
| `edge_case` | Non-obvious behavior discovered | "Prisma returns null for empty arrays" |
| `domain` | Problem space knowledge | "Users expect weekly reports on Mondays" |
| `pattern` | Useful code pattern | "Use discriminated unions for state" |
| `decision` | Architectural choice made | "Chose SQLite over Postgres for simplicity" |
| `gotcha` | Thing that tripped us up | "Remember to await the middleware" |

---

## MCP Tools API

### Loop Management

```typescript
// Start a new work session
loop.start({
  repoPath?: string,  // Defaults to cwd
}) → {
  repo: { name, path },
  currentTask: Task | null,
  suggestedTask: Task | null,
  recentLearnings: Learning[],  // Last 5, relevant to suggested task
  sessionNumber: number,
  rulesDigest: string,  // Compressed AGENTS.md summary
}

// End the current session
loop.end({
  taskId: string,
  outcome: 'complete' | 'blocked' | 'partial',
  notes: string,
  learnings?: Array<{
    type: LearningType,
    content: string,
    tags?: string[]
  }>,
  needsQA?: boolean
}) → { success: true, sessionId: string }

// Get current loop status
loop.status() → {
  inProgress: boolean,
  currentTask: Task | null,
  sessionDuration: number,
  repo: Repo
}
```

### Task Management

```typescript
// Add a new task
task.add({
  id: string,        // e.g., "LF-001"
  title: string,
  description?: string,
  priority?: 'high' | 'medium' | 'low',
  dependsOn?: string[],
  acceptanceCriteria?: string[]
}) → Task

// Update task status/details
task.update({
  id: string,
  status?: TaskStatus,
  notes?: string,
  ...partial
}) → Task

// Query tasks
task.list({
  status?: TaskStatus | TaskStatus[],
  priority?: Priority,
  search?: string
}) → Task[]

// Get task with full context
task.get(id: string) → {
  task: Task,
  dependencies: Task[],
  relatedLearnings: Learning[]
}
```

### Learning Management

```typescript
// Record a learning (also possible via loop.end)
learning.add({
  type: LearningType,
  content: string,
  tags?: string[],
  taskId?: string
}) → Learning

// Search learnings
learning.search({
  query?: string,      // Full-text search
  type?: LearningType,
  tags?: string[],
  repoId?: string,     // null = all repos
  limit?: number
}) → Learning[]

// Get learnings related to a topic/task
learning.related({
  taskId?: string,
  topic?: string,
  limit?: number
}) → Learning[]
```

### Repository Management

```typescript
// Initialize loop-flow for a repo
repo.init({
  path: string,
  name?: string,
  template?: 'generic' | 'nextjs' | 'python' | 'go',
  createAgentsMd?: boolean
}) → Repo

// List managed repos
repo.list() → Repo[]

// Switch active repo
repo.switch(pathOrName: string) → Repo

// Migrate from file-based workflow
repo.migrate({
  backlogPath: string,   // path to backlog.json
  progressPath: string   // path to progress.txt
}) → { tasksImported: number, learningsImported: number }
```

### Export/Import

```typescript
// Export for human viewing
export.backlog({ format: 'json' | 'markdown' }) → string
export.progress({ format: 'json' | 'markdown', limit?: number }) → string
export.learnings({ format: 'json' | 'markdown', tags?: string[] }) → string

// Serve local dashboard UI
ui.serve({ port?: number }) → { url: string }
```

---

## CLI Interface

For human operators (not the AI):

```bash
# Initialize in current directory
loop-flow init [--template=nextjs]

# View status
loop-flow status

# List tasks
loop-flow tasks [--status=todo]

# Export readable backlog
loop-flow export backlog --format=markdown

# Migrate from file-based workflow
loop-flow migrate --backlog=.agents/plan/backlog.json --progress=.agents/plan/progress.txt

# Start local dashboard
loop-flow ui

# Manage repos
loop-flow repos list
loop-flow repos add ~/projects/other-project

# Configure
loop-flow config set default_template nextjs
```

---

## File System Layout

### Global (per-user)

```
~/.loop-flow/
├── loop-flow.db      # SQLite database (all repos, all data)
├── config.yaml       # Global configuration
└── templates/        # User-customized templates
    └── my-company.md
```

### Per-Repository (optional)

```
my-project/
├── AGENTS.md         # Team rules (committed)
├── .loopflow         # Marker file, minimal config
└── .gitignore        # Should include .loopflow
```

The `.loopflow` file is optional and minimal:
```yaml
# .loopflow
name: my-project
template: nextjs
# Data lives in ~/.loop-flow/loop-flow.db
```

---

## Design Decisions

### 1. Single Global Database

**Decision:** All repos share one SQLite database in `~/.loop-flow/`.

**Rationale:**
- Cross-repo learning search becomes trivial
- No per-repo setup needed
- Single backup location
- CLI/UI can show unified dashboard

**Trade-off:** Less portable (can't just copy `.agents/` folder).

### 2. MCP as Primary Interface

**Decision:** AI interacts via MCP protocol, not file reading.

**Rationale:**
- Control over what context is returned
- Can optimize for token economy
- Structured responses, not file parsing
- Can add features without changing file format

### 3. Minimal Per-Repo Footprint

**Decision:** Only optional `.loopflow` marker file in repos.

**Rationale:**
- Don't pollute projects with workflow files
- Works with any project structure
- No gitignore management needed
- Team members without loop-flow see nothing

### 4. Learning-Centric Design

**Decision:** Learnings are first-class, searchable, tagged entities.

**Rationale:**
- Knowledge compounds over time
- Cross-repo insights valuable
- Can surface relevant context automatically
- Enables future team sharing

### 5. Preserve "Loop" Semantics

**Decision:** Explicit `loop.start()` and `loop.end()` ceremony.

**Rationale:**
- Clear session boundaries
- Matches human mental model
- Enables session analytics
- Forces completion/documentation

---

## Future Considerations (Pinned Ideas)

### Team Sharing
- Sync learnings across team members
- Shared task backlog (team mode)
- Learning endorsement/upvoting
- Export learnings to team wiki

### Multi-Repo Intelligence
- Cross-repo task dependencies
- Suggest learnings from other repos
- "This pattern worked in project X"
- Unified dashboard across all projects

### Analytics
- Session duration tracking
- Task completion rates
- Learning frequency by type
- Productivity insights

### Integrations
- GitHub Issues sync
- Linear/Jira import
- Slack notifications
- VS Code extension

---

## Open Questions

1. **MCP Transport:** stdio vs HTTP? How does Claude Code discover servers?
2. **Auth:** For team sync, how to handle authentication?
3. **Conflict Resolution:** If two sessions modify same task?
4. **Learning Relevance:** How to determine which learnings are relevant to surface?
5. **Template Inheritance:** Can templates extend other templates?

---

## Implementation Phases

### Phase 0: Foundation (Current)
- [ ] Research MCP protocol
- [ ] Set up TypeScript project
- [ ] Implement SQLite schema
- [ ] Basic CLI (init, status)

### Phase 1: Core MCP
- [ ] MCP server skeleton
- [ ] loop.start / loop.end
- [ ] task.add / task.update / task.list
- [ ] learning.add / learning.search

### Phase 2: Developer Experience
- [ ] Migration from file-based workflow
- [ ] Export commands
- [ ] Local dashboard UI
- [ ] Templates system

### Phase 3: Multi-Repo
- [ ] Repo management commands
- [ ] Cross-repo learning search
- [ ] Unified dashboard

### Phase 4: Team Features (Future)
- [ ] Sync protocol design
- [ ] Conflict resolution
- [ ] Shared learnings

---

*Document version: 0.1.0*
*Last updated: 2026-01-17*
