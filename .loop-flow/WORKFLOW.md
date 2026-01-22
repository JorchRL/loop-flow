# LoopFlow Workflow Rules

**LoopFlow Version:** 1.0.0

This file defines how AI agents should work in this repository using the LoopFlow methodology.

LoopFlow is a **theory preservation system** (ref: Naur's "Programming as Theory Building"). The code is the artifact, but the theory in your head is the real product. This workflow helps capture that theory before it's lost.

---

## Core Principles

1. **Developer has the reins**: The developer is in charge. AI agents are tools to help. The developer makes final decisions and MUST design the architecture, data models, and APIs. This isn't just about control — it's about preserving and developing the developer's capacity to think deeply about software.

2. **Ask Questions Before Implementing**: If the requirement is ambiguous, the data model is unclear, or there are multiple implementations, ask for clarification immediately. Ask questions to force the user to think deeply about the problem. The goal is insight, not just answers.

3. **Second order reasoning**: Consider second order effects. Ask the user to consider the second order effects of their design decisions. Help them think, don't think for them.

4. **Foster Learning**: AI should help developers become better engineers, not create dependency. Explain *why*, not just *what*. When possible, teach the underlying concept.

5. **One task, one session**: Complete one focused task per session. No partial progress across sessions. If a task is too big, break it down first.

6. **Capture insights**: Record edge cases, gotchas, domain knowledge, and insights. Knowledge in your context window gets lost between sessions — write it down.

7. **No commit without permission**: AI agents never commit or push without explicit approval.

---

## Session Workflow

```
Session Start (loop_orient)
    |
    v
Pick a task (loop_task_update -> IN_PROGRESS)
    |
    v
Work (capture insights with loop_remember)
    |
    v
Complete task (loop_task_update -> DONE)
    |
    v
Session End (loop_handoff)
```

### 1. START — `loop_orient`

Call `loop_orient` to get full context:
- Workflow rules (this file)
- All insights from the knowledge base
- Task backlog with priorities
- Recent sessions and outcomes
- Suggested actions from previous session

The backlog is a **menu, not a queue** — pick the most valuable task for right now, considering dependencies, priority, and context.

### 2. SELECT — `loop_task_update`

- Choose ONE task to work on
- Update status to `IN_PROGRESS`: `loop_task_update(id, status="IN_PROGRESS")`
- Consider: dependencies, value, complexity
- This is a **sprint board** model, not a linear queue
- If unclear, ask the developer for direction

### 3. IMPLEMENT

- Work on the selected task
- Follow existing patterns in the codebase
- Keep business logic testable (pure functions where possible)
- **Capture insights** with `loop_remember` as you discover them
- If subtasks emerge:
  - **Small/necessary** (< 10 min): Just do them, maybe mention "btw handling X"
  - **Medium** (could be own task): Quick check: "Tackle now or add to backlog?"
  - **Large** (scope creep): Add with `loop_task_create`, stay focused
  - **Uncertain**: Always ask

### 4. TEST

- Validate your work with tests
- Tests go in `__tests__/` folders near the code they test
- Tests must be human-readable: describe INTENT, not mechanics
- Run tests: `npm test`
- **No commit if tests fail**

### 5. COMPLETE — `loop_task_update`

- Update task status to `DONE`: `loop_task_update(id, status="DONE")`
- Add notes about what was accomplished if relevant

### 6. HANDOFF — `loop_handoff`

End the session gracefully:
```
loop_handoff(
  mode="graceful",
  completed=["What was done"],
  next_session_should="What to do next"
)
```

This saves state for the next session:
- Suggested actions persisted to database
- Session record created
- JSON files exported for git

**Agent does NOT commit** — developer handles git.

---

## MCP Tools Reference

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `loop_orient` | Get full context | Session start |
| `loop_remember` | Capture insight | During work, when something feels important |
| `loop_scan` | Search summaries | Find relevant insights/tasks |
| `loop_expand` | Get full details | After scan, need complete content |
| `loop_connect` | Find related items | Exploring connections |
| `loop_probe` | Ask user question | Need clarification with options |
| `loop_handoff` | End session | Session complete or context filling |
| `loop_task_create` | Create task | New work identified |
| `loop_task_update` | Update task | Status, priority, notes |
| `loop_task_list` | List tasks | See backlog with filters |
| `loop_insight_update` | Update insight | Tags, links, status |
| `loop_update_summary` | Update repo context | Leave notes for next session |
| `loop_export` | Export to JSON | Before git commit |

---

## Data Storage

LoopFlow uses SQLite as the source of truth. JSON files are exported for git commits and human review.

| Data | Storage | Export |
|------|---------|--------|
| Tasks | SQLite | `backlog.json` |
| Insights | SQLite | `insights.json` |
| Sessions | SQLite | (not exported) |
| Repo context | SQLite | (not exported) |

---

## Task Schema

```json
{
  "id": "LF-XXX",
  "title": "[TYPE] Short descriptive title",
  "description": "What needs to be done and why",
  "status": "TODO | IN_PROGRESS | DONE | BLOCKED | CANCELLED",
  "priority": "high | medium | low",
  "depends_on": ["LF-YYY"],
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "notes": "Optional context"
}
```

### Task Types (Title Prefixes)

| Prefix | Purpose | When to Use |
|--------|---------|-------------|
| `[IMPL]` | Implementation work | Writing code, tests, documentation |
| `[DESIGN]` | Discussion/decision task | Architecture, data models, API design — think before coding |
| `[SPIKE]` | Exploratory research | Reduce uncertainty before committing to an approach |
| `[LEARN]` | Acquire external knowledge | Understand docs, libraries, domains |
| `[REVIEW]` | Audit existing code/docs | Code review, TODO triage, documentation audit |
| `[BUG]` | Fix a defect | Something is broken and needs fixing |
| `[DOCS]` | Documentation | README, guides, API docs |

Design tasks come first — make decisions before coding.

---

## Insight Capture

Insights are first-class entities forming a **knowledge graph**.

### Leverage Hierarchy

Not all insights are equal. Prioritize higher-leverage types:

| Type | Leverage | Description | Example |
|------|----------|-------------|---------|
| `process` | Highest | How to work better | "One task per session prevents context rot" |
| `domain` | High | Problem space knowledge | "Users expect weekly reports on Mondays" |
| `architecture` | Medium-High | Design decisions and rationale | "Chose SQLite for simplicity" |
| `edge_case` | Medium | Non-obvious behavior | "API returns null for empty arrays" |
| `technical` | Lower | Useful tricks | "Use discriminated unions for state" |

### Capture with `loop_remember`

```
loop_remember(
  content="The insight text",
  type="technical",
  tags=["relevant", "tags"]
)
```

**Quick capture** — Don't derail the current task. Snapshot and keep going.

### Proactive Capture

AI agents should **proactively probe for emerging insights**. When an idea starts floating around but isn't yet articulated, help surface it.

Entry points:
- **User says "Note: ..."** → capture immediately
- **Agent notices insight** → ask "Worth capturing?"
- **Emerging idea** → help articulate it

---

## Scope Management

### One Task = One Session
- A backlog task should be completable within one context window
- No partial progress across sessions
- **No context compaction** (causes context rot)

### Session Boundaries

End a session when:
- Task is complete
- Natural stopping point reached
- Context window is filling up (better to handoff clean than compact)

---

## Communication Protocol

### Always Ask When:
- Scope is ambiguous
- A task seems too large for one session
- Trade-offs need developer input
- You want to add significant new tasks
- Architectural decisions need review

### Always Capture When:
- You discover a pattern worth documenting
- A non-obvious insight emerges
- Domain knowledge is shared
- An architectural decision is made

---

## Anti-Patterns

- **Don't** do multiple backlog tasks in one session
- **Don't** leave tests failing at end of session
- **Don't** make large architectural changes without asking
- **Don't** assume user intent — ask when uncertain
- **Don't** commit or push without permission
- **Don't** use context compaction (causes context rot)
- **Don't** treat the backlog as a queue — it's a menu

---

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
