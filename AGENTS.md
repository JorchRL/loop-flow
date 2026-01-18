# Loop-Flow Development Rules

## Project Overview

**Loop-Flow** is an MCP server that provides structured AI-assisted development workflows. It manages tasks, sessions, learnings, and context across multiple repositories.

**Tech Stack**: TypeScript, Node.js, SQLite, MCP Protocol

---

## Workflow Rules

1. **Developer has the reins**: The developer is in charge. AI agents are tools to help. The developer makes final decisions and MUST design the architecture, data models, and APIs.

2. **Ask Questions Before Implementing**: If the requirement is ambiguous, the data model is unclear, or there are multiple implementations, ask for clarification immediately. Ask questions to force the user to think deeply about the problem.

3. **Second order reasoning**: Consider second order effects. Ask the user to consider the second order effects of their design decisions.

4. **AI Agents**: **Never** commit or push changes to the repository without explicit permission.

---

## Core Philosophy

### Architecture
- Design for change and scalability. Anticipate change as a constant.
- Prioritize loose coupling. Changes to one module shouldn't cascade through others.
- Code against abstractions (interfaces), not concrete implementations.
- Prefer composition over inheritance.
- Avoid global mutable state.

### Contracts & Interfaces
- Define explicit interfaces at system boundaries.
- Use TypeScript interfaces for component props and function parameters.
- Document inputs/outputs with JSDoc.
- Clear contracts between components.

### Process
- **Understand before changing**: Read existing code, check related files, understand data flow.
- **Follow existing patterns** before inventing new approaches.
- **DRY**: Every piece of knowledge should have a single, authoritative representation.
- **Orthogonality**: Changes in one feature should not break unrelated features.

### Code Quality
- Fix linting errors immediately.
- Remove unused imports and delete dead code.
- Don't leave bad code lying around—a single broken window invites more.
- Good Enough Software: Perfect is the enemy of shipped.

### Development Approach
- **Tracer Bullets**: Build thin, end-to-end slices first to validate architecture.
- **Easy to change?**: Ask "does this decision make things easier to change in the future?"

---

## Coding Standards

- **TypeScript strict mode** - Always.
- **Avoid `any`**: Prefer explicit, well-defined types.
- **Minimize nullable types**: Use them intentionally (e.g., `deletedAt: Date | null`), not by default.
- **Crash Early**: Fail fast with clear errors rather than propagating bad state.
- **Use Assertions**: Validate assumptions explicitly at system boundaries.
- **Descriptive Errors**: Error messages should help diagnose the problem. Log with sufficient context.
- **Refactor Early, Refactor Often**: Improve code as you touch it.
- **Pure functions** for business logic. Side effects at boundaries (CLI, MCP handlers, DB).
- **Test Critical Paths**: Focus testing on high-impact flows.
- **Design for unit testing**: Keep business logic as pure functions. Avoid external dependencies.
- **Prefer generated data over mocks**: For integration tests, generate realistic test scenarios.
- **Code as Documentation**: Use clear naming. Comments explain _why_, not _what_.
- **Simplicity wins**: Avoid cleverness. Simple is better than complex.

---

## Learning & Documentation

Loop-Flow is a **theory preservation system** (ref: Naur's "Programming as Theory Building"). The code is the artifact, but the theory in your head is the real product. Capture it or lose it.

**Record Your Learnings**: When you discover edge cases, domain quirks, non-obvious behaviors, or useful tricks—write them down. Knowledge in the AI's context window gets lost between sessions.

**Proactive Insight Capture**: AI agents should actively propose when something is worth documenting—don't just silently note things. Ask the developer: "Should we capture this insight?"

**Rubber Ducking**: Explain problems in chat to find solutions. Write down what you expected, what happened, and what you've tried.

### Insight Capture Protocol

Insights are first-class entities stored in `.agents/plan/insights.json`. They form a knowledge graph.

**Two Modes:**

1. **Quick Capture** — Don't derail the current task
   - Snapshot the insight with minimal detail
   - Mark as `unprocessed`
   - Optionally schedule a `[DISCUSS]` task
   - Return to work immediately

2. **Deep Synthesis** — Dedicated discussion time
   - Socratic exploration: why does this matter? what connects?
   - Create links to related insights
   - May synthesize new higher-level insights
   - Mark as `discussed`

**Leverage Hierarchy** (prioritize higher-leverage insights):

| Type | Leverage | Description |
|------|----------|-------------|
| `process` | Highest | How to work better (meta-learning) |
| `domain` | High | Problem space knowledge |
| `architecture` | Medium-High | Design decisions and rationale |
| `edge_case` | Medium | Non-obvious behavior, test insights |
| `technical` | Lower | Useful tricks, local knowledge |

**When to Capture:**
- Process improvements (these are GOLD)
- Domain discoveries that shape design
- Architectural decisions with rationale
- Edge cases that inform testing
- Technical tricks (lower priority, but still useful)

---

## Session Workflow

This project uses the file-based workflow we're building Loop-Flow to replace (dogfooding).

### 1. START
- Read `.agents/plan/backlog.json` (task pool)
- Read `.agents/plan/progress.txt` (recent history)
- Understand current state

### 2. SELECT
- Choose the most valuable task to work on RIGHT NOW
- Consider: dependencies, value, complexity
- This is a **sprint board** model, not a linear queue
- If unclear, ask the developer for direction

### 3. IMPLEMENT
- Write code for the selected task
- Follow patterns in this `AGENTS.md`
- Keep business logic in pure functions where possible
- Business logic should be testable in isolation

### 4. TEST
- Write tests that validate business rules
- Tests go in `__tests__/` folders near the code they test
- Tests must be human-readable: describe INTENT, not mechanics
- Run tests: `npm test`
- **No commit if tests fail**

### 5. UPDATE
- Update task status in `.agents/plan/backlog.json`
- Append session entry to `.agents/plan/progress.txt`
- Mark if manual QA is required

### 6. HANDOFF
- Session complete
- State is fully captured in backlog + progress
- **Agent does NOT commit** — developer handles git
- Next session starts fresh

---

## Task ID Convention

Use prefix `LF-XXX` for all Loop-Flow tasks.

Future projects using this workflow should define their own prefixes based on concerns (e.g., `API-XXX`, `UI-XXX`, `INFRA-XXX`).

---

## Scope Management

### One Task = One Session
- A backlog task should be completable within one context window
- No partial progress across sessions
- **No context compaction** (causes context rot)

### When Subtasks Emerge
- **Small/necessary**: Just do them within the session
- **Large/optional**: Add to backlog and ask developer for approval
- **Uncertain**: Always ask

### Special Task Types
- `[REVIEW]` — Audit and triage existing TODOs/docs
- `[DESIGN]` — Discussion/decision task, not implementation
- `[SPIKE]` — Exploratory work to reduce uncertainty
- `[IMPL]` — Implementation task
- `[DISCUSS]` — Synthesis session for unprocessed insights
- `[DISCOVERY]` — Rapid Q&A to extract requirements/preferences

### Conversation Modes

Modes describe how conversation flows. They blend fluidly — agent reads the vibe.

| Mode | Purpose | Style |
|------|---------|-------|
| **Work** | Implementing, coding | Focused, efficient, minimal meta-commentary |
| **Discovery** | Extract requirements | Rapid Q&A with choices, breadth over depth |
| **Discuss** | Explore one insight | Socratic, deep, builds understanding |
| **Review** | Audit what exists | Evaluative, critical |

Agent can name mode shifts in Discovery/Discuss/Review, but NOT in Work (preserve context).

---

## File Locations

| Purpose | Location |
|---------|----------|
| Task pool | `.agents/plan/backlog.json` |
| Session history | `.agents/plan/progress.txt` |
| Insights (knowledge graph) | `.agents/plan/insights.json` |
| Design docs | `docs/` |
| Reference files | `.agents/reference/` (if needed) |

---

## Backlog Task Schema

```json
{
  "id": "LF-XXX",
  "title": "Short descriptive title",
  "description": "What needs to be done and why",
  "status": "TODO | IN_PROGRESS | DONE | NEEDS_QA | QA_PASSED",
  "priority": "high | medium | low",
  "depends_on": ["LF-YYY"],
  "acceptance_criteria": [
    "Criterion 1",
    "Criterion 2"
  ],
  "test_file": "path/to/__tests__/file.test.ts (once written)",
  "notes": "Optional additional context"
}
```

---

## Progress Entry Format

The progress file is both a **session log** and a **learning journal**. Record not just what was done, but what was learned—edge cases, domain quirks, useful tricks. Knowledge in the AI's context window gets lost between sessions.

```
## YYYY-MM-DD | Session N
Task: LF-XXX Title
Outcome: COMPLETE | BLOCKED | PARTIAL (with reason)
Tests: path/to/__tests__/file.test.ts (N passing)
Manual QA: REQUIRED | NOT_REQUIRED
Notes: Any relevant context for future sessions

### Learnings (optional but encouraged)
- Edge case: [non-obvious behavior discovered]
- Domain: [something learned about the problem space]
- Pattern: [useful pattern discovered]
- Decision: [architectural choice made and why]

---
```

---

## Communication Protocol

### Always Ask When:
- Scope is ambiguous
- A task seems too large for one session
- Trade-offs need developer input
- You want to add significant new tasks
- Architectural decisions need review

### Always Propose When:
- You discover a pattern worth documenting
- A non-obvious insight emerges (edge case, domain quirk, useful trick)
- Something should be added to progress.txt learnings
- A workflow improvement becomes apparent

*Don't just silently note things — ask the developer if they want to capture the insight.*

### Always Note When:
- Manual QA is required (mark task as `NEEDS_QA`)
- Tests are passing but behavior needs human verification
- You made an architectural decision that should be reviewed

---

## Anti-Patterns

- **Don't** do multiple backlog tasks in one session
- **Don't** leave tests failing at end of session
- **Don't** make large architectural changes without asking
- **Don't** let progress.txt fall out of sync with reality
- **Don't** assume user intent—ask when uncertain
- **Don't** commit or push without permission
- **Don't** use context compaction (causes context rot)

---

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
