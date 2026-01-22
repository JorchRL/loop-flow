# LoopFlow Design Document

> An MCP server for structured AI-assisted development workflows.

---

## Vision

LoopFlow solves the problem of **context rot** in AI-assisted development. When working with AI agents across multiple sessions:

1. **Context is lost** - Each new session starts from scratch
2. **Workflow files grow unbounded** - Eventually scaffolding alone fills the context window
3. **Learnings disappear** - Insights discovered in one session aren't available in the next
4. **Multi-repo work is fragmented** - No unified view across projects

LoopFlow provides a **database-backed MCP server** that:
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
- Multiple repos managed by one LoopFlow instance

### 3. Learnings (Zettelkasten)

**Learnings** are first-class entities forming a **knowledge graph**, not just log entries.

Inspired by Naur's "Programming as Theory Building" — the code is the artifact, but the **theory in your head** is the real product. LoopFlow is a **theory preservation system**.

Properties:
- **Linked**: Learnings connect to other learnings (the link itself is often an insight)
- **Typed**: Categorized by leverage level
- **Cross-repo**: Searchable across all projects
- **Stateful**: Can be `unprocessed` (quick capture) or `discussed` (synthesized)

#### Learning Leverage Hierarchy

Not all learnings are equal. Higher-leverage learnings compound more:

| Level | Type | Description | Example |
|-------|------|-------------|---------|
| 1 (Highest) | `process` | Meta-learning about how to work | "Smaller tasks work better than big ones" |
| 2 | `domain` | Problem space knowledge | "Users expect weekly reports on Mondays" |
| 3 | `architecture` | Design decisions and rationale | "Chose SQLite because single-user, no server" |
| 4 | `edge_case` | Non-obvious behavior, testing insights | "API returns null for empty arrays" |
| 5 (Lowest) | `technical` | Useful tricks, local knowledge | "Use `--no-verify` to skip hooks" |

#### Quick Capture vs Deep Synthesis

Learnings have two modes:

1. **Quick capture** — Snapshot insight without derailing current work
   - Minimal context spent
   - Marked as `unprocessed`
   - Auto-schedules `[DISCUSS]` task

2. **Deep synthesis** — Dedicated time to link, enrich, discuss
   - Socratic exploration of the insight
   - Create links to related learnings
   - May synthesize new higher-level insights
   - Mark as `discussed`

### 4. Context Economy

Every API response is designed for **minimal context consumption**:
- `loop.start()` returns a focused summary, not raw files
- `loop.getContext(topic)` returns only relevant learnings
- `loop.suggestTask()` returns one recommendation, not the entire backlog
- Export commands generate human-readable files on-demand

### 5. Distributed Discovery

**Domain knowledge lives in people's heads.** Loop-Flow can use AI agents as parallel interviewers to extract this tacit knowledge.

The pattern: embed a special `MINILOOP.md` in a package/folder that "programs" AI assistants to run structured domain discovery sessions. When team members work in that context, their AI conducts an interview, probing for edge cases, mental model mismatches, and "oh but actually..." moments.

Results are saved to unique per-person files that can be committed and later synthesized by a lead.

**Benefits over traditional approaches:**
- No scheduling overhead (async, at participant's convenience)
- Lower social pressure (easier to say "I don't know" to AI)
- Consistent probe depth (AI follows protocol every time)
- Scales to any team size (run in parallel)
- Captures verbatim quotes (humans paraphrase)

See [DISTRIBUTED-DISCOVERY.md](./DISTRIBUTED-DISCOVERY.md) for the full pattern, including MINILOOP.md structure, output format, and synthesis process.

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
│ agents_md_path  │       │ type            │  ← [IMPL|DESIGN|SPIKE|LEARN|REVIEW|BUG|DISCUSS|DISCOVERY]
│ created_at      │       │ description     │
│ last_session    │       │ status          │
└─────────────────┘       │ priority        │
         │                │ depends_on[]    │
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
│ started_at      │       │ type            │  ← process|domain|architecture|edge_case|technical
│ ended_at        │       │ content         │
│ outcome         │       │ tags[]          │
│ notes           │       │ status          │  ← unprocessed|discussed
└─────────────────┘       │ links[]         │  ← IDs of related learnings
                          │ created_at      │
                          └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ learning_links  │  (join table for rich links)
                          ├─────────────────┤
                          │ from_id         │
                          │ to_id           │
                          │ relation        │  ← builds_on|contradicts|exemplifies|synthesizes
                          │ note (opt)      │  ← the link itself can be an insight
                          └─────────────────┘
```

#### Learning-to-Learning Relationships

Links between learnings are first-class because **the relationship is often an insight itself**.

| Relation | Meaning |
|----------|---------|
| `builds_on` | This insight extends or deepens another |
| `contradicts` | This insight challenges or refines another |
| `exemplifies` | This is a concrete example of an abstract insight |
| `synthesizes` | This insight was created by combining others |

### Learning Types (by Leverage)

| Type | Leverage | Description | Example |
|------|----------|-------------|---------|
| `process` | Highest | How to work better | "One task per session prevents context rot" |
| `domain` | High | Problem space knowledge | "Users expect weekly reports on Mondays" |
| `architecture` | Medium-High | Design decisions and why | "Chose SQLite over Postgres for simplicity" |
| `edge_case` | Medium | Non-obvious behavior, test insights | "Prisma returns null for empty arrays" |
| `technical` | Lower | Useful tricks, local knowledge | "Use discriminated unions for state" |

**Note:** `pattern` and `gotcha` from earlier design are subsumed:
- `pattern` → usually `architecture` or `technical` depending on scope
- `gotcha` → usually `edge_case`

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
// Quick capture an insight (minimal context, schedules [DISCUSS] task)
learning.capture({
  content: string,
  type?: LearningType,  // Optional, can be classified later
  tags?: string[],
  taskId?: string
}) → { learning: Learning, discussTask: Task }

// Record a fully-formed learning (also possible via loop.end)
learning.add({
  type: LearningType,
  content: string,
  tags?: string[],
  taskId?: string,
  status?: 'unprocessed' | 'discussed',
  links?: Array<{ toId: string, relation: LinkRelation, note?: string }>
}) → Learning

// Link two learnings (the link itself can have a note/insight)
learning.link({
  fromId: string,
  toId: string,
  relation: 'builds_on' | 'contradicts' | 'exemplifies' | 'synthesizes',
  note?: string  // The link itself can be an insight
}) → LearningLink

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
loop-flow migrate --backlog=.loop-flow/plan/backlog.json --progress=.loop-flow/plan/progress.txt

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
├── AGENTS.md           # Team rules (committed)
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

**Trade-off:** Less portable (can't just copy `.loop-flow/` folder).

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

### Knowledge Abstraction & Context Scaling

As learnings accumulate, we can't load everything into context. Solution: **abstraction mirrors how humans learn**.

- Many concrete insights → synthesize into fewer abstract principles
- Concrete insights "archive" (still searchable, not loaded by default)
- Abstract principles loaded, concretes fetched on-demand
- This keeps context bounded while wisdom grows

Example: 10 edge-case insights about API behavior → 1 architectural insight about "defensive API consumption patterns"

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

Loop-Flow is **local-first**. Local SQLite is the source of truth. Team/cloud features layer on top via sync, not the other way around. This preserves developer autonomy, enables offline work, and aligns with "developer has the reins."

### Phase 0: File-Based Bootstrap (Current)

**Goal:** Use the file-based workflow to build Loop-Flow itself. True dogfooding.

```
┌─────────────┐                    ┌─────────────────────────┐
│ Claude Code │ ───reads/writes──► │ .loop-flow/plan/        │
│             │                    │ (backlog.json, etc.)    │
└─────────────┘                    └─────────────────────────┘
```

- [x] Project bootstrap and documentation
- [x] Domain model analysis
- [x] UX requirements discovery
- [ ] Research MCP protocol (LF-001) ← **Current**
- [ ] Set up TypeScript project
- [ ] Implement SQLite schema
- [ ] Basic CLI (init, status)
- [ ] Migration tool from file-based workflow

**Exit criteria:** Loop-Flow can manage its own development (replace file-based workflow).

### Phase 1: Local MCP + SQLite (MVP)

**Goal:** Working MCP server that Claude Code can use. Local-only.

```
┌─────────────┐      stdio      ┌─────────────────────────┐
│ Claude Code │ ◄─────────────► │ Loop-Flow MCP Server    │
│             │                 │ (local SQLite)          │
└─────────────┘                 └─────────────────────────┘
```

- [ ] MCP server skeleton (stdio transport)
- [ ] loop.start / loop.end
- [ ] task.* tools (add, update, list, get)
- [ ] learning.* tools (add, search, related, capture)
- [ ] Register with Claude Code

**Exit criteria:** Can run a full development session using MCP tools instead of file reads.

### Phase 2: Local Web Dashboard

**Goal:** Human-browsable interface at localhost. MCP server grows an HTTP API.

```
┌─────────────┐      stdio      ┌─────────────────────────┐
│ Claude Code │ ◄─────────────► │ Loop-Flow MCP Server    │
│             │                 │ (local SQLite)          │
└─────────────┘                 └──────────┬──────────────┘
                                           │ HTTP API
┌─────────────────────────────┐            │
│ Local Web Dashboard         │ ◄──────────┘
│ (localhost:3000)            │
└─────────────────────────────┘
```

- [ ] HTTP API layer (REST or tRPC)
- [ ] Web UI (React + Vite or similar)
- [ ] Browse tasks, learnings, sessions
- [ ] Export/import functionality
- [ ] Templates system

**Exit criteria:** Developer can browse and manage Loop-Flow data without CLI.

### Phase 3: Team/SaaS (Optional Future)

**Goal:** Cloud sync for teams. Local remains source of truth.

```
┌─────────────────────────┐      sync       ┌─────────────────────────┐
│ Local Loop-Flow         │ ◄─────────────► │ Loop-Flow Cloud         │
│ (SQLite)                │                 │ (Postgres, teams)       │
└─────────────────────────┘                 └─────────────────────────┘
```

- [ ] Sync protocol design
- [ ] Conflict resolution strategy
- [ ] Team shared learnings
- [ ] Multi-user authentication
- [ ] Potentially: SaaS offering

**Exit criteria:** Team members can share learnings and optionally tasks across machines.

---

## Open Questions

1. ~~**MCP Transport:** stdio vs HTTP?~~ → **Answered:** stdio for local (Phase 1), HTTP+SSE possible for remote (Phase 3)
2. **Auth:** For team sync, how to handle authentication?
3. **Conflict Resolution:** If two sessions modify same task?
4. **Learning Relevance:** How to determine which learnings are relevant to surface?
5. **Template Inheritance:** Can templates extend other templates?
6. **Claude Code Registration:** Exact config format for adding MCP servers?

---

*Document version: 0.9.0*
*Last updated: 2026-01-22*
*Session: LF-001 MCP Protocol Research*
