# Loop-Flow

> Structured AI-assisted development workflows that actually work.

Loop-Flow helps you collaborate effectively with AI coding assistants (like Claude) while **becoming a better engineer** — not just shipping faster.

In a world of "vibe coding" where AI does the thinking, Loop-Flow takes a different stance: **AI should amplify your thinking, not replace it.** The goal isn't just to build software; it's to build software *and* build yourself.

Loop-Flow provides:

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
5. **Thinking atrophies** — If AI does all the thinking, you stop growing as an engineer

Loop-Flow solves this with a simple workflow: **one task, one session, one handoff** — with the human firmly in the driver's seat.

---

## Quick Start

### Option 1: File-Based Workflow (Available Now)

No installation needed. Just add a few files to your repo:

```bash
# Create the workflow folder (gitignored)
mkdir -p .loop-flow/plan

# Create the backlog
echo '{
  "project": "My Project",
  "last_updated": "'$(date +%Y-%m-%d)'",
  "tasks": []
}' > .loop-flow/plan/backlog.json

# Create the progress log
echo "# Development Progress

This is an append-only log of sessions and learnings.

---" > .loop-flow/plan/progress.txt

# Create the rules file
# (Copy from the scaffold instructions or use the template)
```

Then add `.loop-flow/` to your `.gitignore`.

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

Welcome! This workflow will help you **become a great engineer**, not just someone who uses AI to write code.

The temptation with AI is to let it do the thinking. Don't. Your brain is a muscle — if you don't use it, it atrophies. Loop-Flow is designed to keep you in the driver's seat, making decisions, learning from mistakes, and building real understanding.

### Learn Good Engineering Habits

1. **Think before coding** — Define what "done" looks like before starting. AI can help explore options, but *you* decide.
2. **Work in small increments** — One focused task at a time. This forces clear thinking.
3. **Document as you go** — Future you will thank present you. Writing clarifies thought.
4. **Test your work** — No commit if tests fail. Testing is thinking about edge cases.

### Get Better AI Assistance

The AI works better when you:

- Give it clear, specific tasks (this requires *you* to think through the problem first)
- Let it ask clarifying questions (and actually think about your answers)
- Review its suggestions critically (don't just accept — understand)
- Capture learnings for next time (reflection builds expertise)

### Avoid Common Pitfalls

| Pitfall | Instead |
|---------|---------|
| "Fix everything" tasks | Break into specific, testable tasks |
| Skipping the backlog | Always update task status |
| Losing insights | Write learnings in progress.txt |
| Marathon sessions | One task, then handoff |
| Accepting AI code blindly | Read, understand, then accept or modify |

### The Real Goal

Remember: the code is just the artifact. The real product is **the understanding in your head**. Every session should leave you knowing something you didn't know before — about the problem, the technology, or software engineering itself.

---

## Workflow Files

### `.loop-flow/plan/backlog.json`

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

### `.loop-flow/plan/progress.txt`

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
  --backlog .loop-flow/plan/backlog.json \
  --progress .loop-flow/plan/progress.txt

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

1. **AI should amplify thinking, not replace it** — You make the decisions. AI helps you explore options faster, but the understanding must live in your head.

2. **The goal is growth, not just output** — Shipping code is good. Becoming a better engineer is better. Loop-Flow optimizes for both.

3. **Context windows are precious** — Don't waste them on stale data. But more importantly, don't waste *your* attention on things AI should handle.

4. **Knowledge should compound** — Learnings from today help tomorrow. Write things down. Reflect. Build expertise over time.

5. **Humans design, AI implements** — Architecture, data models, and key decisions are yours. AI can suggest, but you must understand and choose.

6. **Thinking is a fundamental human capacity** — Don't outsource it. AI is powerful, but over-reliance is dangerous. Use it as a tool, not a crutch.

---

## Contributing

This is currently a personal project. If you're interested in contributing, open an issue to discuss.

---

## License

MIT
