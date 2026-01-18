# Loop-Flow

> Structured AI-assisted development workflows that actually work.

Loop-Flow helps you collaborate effectively with AI coding assistants (like Claude) by providing:

- **Session structure** — Clear start/end boundaries for focused work
- **Task management** — Backlog tracking that persists across sessions
- **Learning capture** — Knowledge that compounds instead of getting lost
- **Context economy** — Only load what you need, keep sessions fast

---

## The Problem

When working with AI assistants on code:

1. **Context gets lost** — Each new session starts from scratch
2. **Work is scattered** — No clear record of what was done or decided
3. **Learnings disappear** — Insights discovered in one session aren't available in the next
4. **Sessions bloat** — Loading too much context makes everything slow

Loop-Flow solves this with a simple workflow: **one task, one session, one handoff**.

---

## Quick Start

### Option 1: File-Based Workflow (Available Now)

No installation needed. Just add a few files to your repo:

```bash
# Create the workflow folder (gitignored)
mkdir -p .agents/plan

# Create the backlog
echo '{
  "project": "My Project",
  "last_updated": "'$(date +%Y-%m-%d)'",
  "tasks": []
}' > .agents/plan/backlog.json

# Create the progress log
echo "# Development Progress

This is an append-only log of sessions and learnings.

---" > .agents/plan/progress.txt

# Create the rules file
# (Copy from the scaffold instructions or use the template)
```

Then add `.agents/` to your `.gitignore`.

See [SCAFFOLD.md](./SCAFFOLD.md) for complete setup instructions.

### Option 2: MCP Server (Coming Soon)

```bash
# Not yet implemented - see roadmap
npx loop-flow init
```

---

## How It Works

### The Loop

Every work session follows this pattern:

```
1. START    → Read backlog + recent progress
2. SELECT   → Pick ONE task to work on
3. IMPLEMENT → Write code, follow patterns
4. TEST     → Validate with tests
5. UPDATE   → Record what happened
6. HANDOFF  → Session complete, state captured
```

### Key Principles

**One Task, One Session**
- Pick a single task that can be completed in one session
- No partial progress across sessions (causes "context rot")
- If a task is too big, break it down first

**Explicit State**
- The backlog is the source of truth, not the AI's memory
- Everything important gets written down
- Next session starts fresh with full context

**Learnings Are First-Class**
- Record edge cases, gotchas, and insights
- Tag them so they're searchable later
- Knowledge compounds across sessions

---

## For Junior Developers

Welcome! This workflow will help you:

### Learn Good Engineering Habits

1. **Think before coding** — Define what "done" looks like before starting
2. **Work in small increments** — One focused task at a time
3. **Document as you go** — Future you will thank present you
4. **Test your work** — No commit if tests fail

### Get Better AI Assistance

The AI works better when you:

- Give it clear, specific tasks
- Let it ask clarifying questions
- Review its suggestions critically
- Capture learnings for next time

### Avoid Common Pitfalls

| Pitfall | Instead |
|---------|---------|
| "Fix everything" tasks | Break into specific, testable tasks |
| Skipping the backlog | Always update task status |
| Losing insights | Write learnings in progress.txt |
| Marathon sessions | One task, then handoff |

---

## Workflow Files

### `.agents/plan/backlog.json`

Your task pool. Not a linear queue — pick the most valuable task each session.

```json
{
  "project": "My Project",
  "last_updated": "2026-01-17",
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Add user authentication",
      "description": "Implement login/logout with session management",
      "status": "TODO",
      "priority": "high",
      "acceptance_criteria": [
        "User can log in with email/password",
        "Session persists across page refreshes",
        "Logout clears session"
      ]
    }
  ]
}
```

**Task Statuses:**
- `TODO` — Not started
- `IN_PROGRESS` — Being worked on now
- `DONE` — Complete, tests passing
- `NEEDS_QA` — Needs human verification
- `BLOCKED` — Waiting on something

### `.agents/plan/progress.txt`

Append-only log of sessions AND learnings.

```markdown
## 2026-01-17 | Session 1
Task: TASK-001 Add user authentication
Outcome: COMPLETE
Tests: src/__tests__/auth.test.ts (12 passing)
Manual QA: REQUIRED (test login flow in browser)

### Learnings
- Edge case: Session cookie must be httpOnly for security
- Pattern: Use middleware for auth checks, not per-route
- Decision: Chose JWT over sessions for stateless scaling

---
```

### `AGENTS.md`

Rules for AI agents. Put this in your repo root (committed, shared with team).

---

## Task Types

Use prefixes to categorize tasks:

| Prefix | Meaning |
|--------|---------|
| `[DESIGN]` | Discussion/decision task, not implementation |
| `[IMPL]` | Implementation task |
| `[SPIKE]` | Exploratory work to reduce uncertainty |
| `[REVIEW]` | Audit existing code/docs |
| `[BUG]` | Fix a defect |

**Example:**
```
[DESIGN] User authentication approach
[IMPL] Add login endpoint
[IMPL] Add logout endpoint  
[IMPL] Add session middleware
```

Design tasks come first — make decisions before coding.

---

## Communication with AI

### Tell the AI to Ask When:
- Requirements are unclear
- Multiple approaches exist
- Trade-offs need your input

### Expect the AI to Propose:
- New tasks discovered during work
- Insights worth documenting
- Workflow improvements

### You Decide:
- Architecture and data models
- What to build next
- When to ship

**Remember: You're the engineer. The AI is a tool.**

---

## Migrating to MCP Server

When the MCP server is ready, migration is simple:

```bash
# Install loop-flow
npm install -g loop-flow

# Migrate your existing workflow
loop-flow migrate \
  --backlog .agents/plan/backlog.json \
  --progress .agents/plan/progress.txt

# Now use MCP tools instead of file editing
```

Your task history and learnings transfer automatically.

---

## Roadmap

- [x] File-based workflow (documentation)
- [ ] MCP server with `loop.start` / `loop.end`
- [ ] Task management tools (`task.add`, `task.update`)
- [ ] Learning search (`learning.search`)
- [ ] Multi-repo support
- [ ] Local dashboard UI
- [ ] Team sync (share learnings)

---

## Philosophy

This workflow is built on a few core beliefs:

1. **AI assistants work best with clear scope** — Ambiguity leads to bad output
2. **Context windows are precious** — Don't waste them on stale data
3. **Knowledge should compound** — Learnings from today help tomorrow
4. **Humans design, AI implements** — You make the decisions

---

## Contributing

This is currently a personal project. If you're interested in contributing, open an issue to discuss.

---

## License

MIT
