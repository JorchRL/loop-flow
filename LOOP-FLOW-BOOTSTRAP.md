# Loop-Flow Bootstrap

> Drop this file into any repository and ask your AI agent to scaffold Loop-Flow.

**Usage:** Copy this file to your project root, then tell your AI agent:
> "Please scaffold Loop-Flow for this project using LOOP-FLOW-BOOTSTRAP.md"

---

## AGENT INSTRUCTIONS

When a user asks you to scaffold Loop-Flow using this file, perform the following steps:

### Step 0: Determine project name

Ask the user for the project name, or infer it from the folder name (e.g., `~/projects/my-app` → "My App").

Use this name to replace `PROJECT_NAME` in all templates below.

### Step 1: Create the folder structure

```bash
mkdir -p .loop-flow/plan
```

### Step 2: Create `.loop-flow/plan/backlog.json`

Use this template, replacing placeholders:

```json
{
  "project": "PROJECT_NAME",
  "last_updated": "YYYY-MM-DD",
  "notes": "Initial backlog - ready for first task",
  "tasks": []
}
```

### Step 3: Create `.loop-flow/plan/progress.txt`

```markdown
# PROJECT_NAME Development Progress

This file is an append-only log of development sessions **and learnings**.

- **Session log**: What was done, outcomes, blockers
- **Learning journal**: Edge cases, domain knowledge, tricks, non-obvious behaviors

---
```

### Step 4: Create `.loop-flow/plan/insights.json`

```json
{
  "schema_version": "0.1.0",
  "description": "Structured learnings (zettelkasten). Links form a knowledge graph.",
  "insights": [],
  "link_types": {
    "builds_on": "This insight extends or deepens another",
    "contradicts": "This insight challenges or refines another",
    "exemplifies": "This is a concrete example of an abstract insight",
    "synthesizes": "This insight was created by combining others"
  }
}
```

### Step 5: Create `.loop-flow/AGENTS.md`

Use the **Loop-Flow Workflow Rules Template** below (see section "TEMPLATE: .loop-flow/AGENTS.md").

### Step 6: Update the root `AGENTS.md`

If the project has a root `AGENTS.md` file:
- **Append** the Loop-Flow initialization instruction (see "APPEND TO ROOT AGENTS.md" section below)
- Do NOT overwrite existing content

If no root `AGENTS.md` exists:
- Create one with minimal content plus the initialization instruction

### Step 7: Add to `.gitignore`

Add this line to `.gitignore` (create if needed):

```
# Loop-Flow workflow state (personal, not committed)
.loop-flow/
```

### Step 8: Delete this bootstrap file

```bash
rm LOOP-FLOW-BOOTSTRAP.md
```

### Step 9: Give the user a quick tutorial

After scaffolding, explain the key concepts using the USER TUTORIAL section below.

---

## APPEND TO ROOT AGENTS.md

Add this block to the **end** of the existing root `AGENTS.md`:

```markdown

---

## Loop-Flow Workflow

This project uses the Loop-Flow workflow for AI-assisted development sessions.

**At the start of every session**, read `.loop-flow/AGENTS.md` for workflow instructions.

To temporarily disable Loop-Flow, comment out or delete the line above.
```

If creating a new root `AGENTS.md`, use this minimal template:

```markdown
# Project Agent Rules

## Project Overview

[Brief description of the project and tech stack]

---

## Loop-Flow Workflow

This project uses the Loop-Flow workflow for AI-assisted development sessions.

**At the start of every session**, read `.loop-flow/AGENTS.md` for workflow instructions.

To temporarily disable Loop-Flow, comment out or delete the line above.
```

---

## TEMPLATE: .loop-flow/AGENTS.md

Create `.loop-flow/AGENTS.md` with this content:

````markdown
# Loop-Flow Workflow Rules

This file defines how AI agents should work in this repository using the Loop-Flow methodology.

Loop-Flow is a **theory preservation system** (ref: Naur's "Programming as Theory Building"). The code is the artifact, but the theory in your head is the real product. This workflow helps capture that theory before it's lost.

---

## Core Principles

1. **Developer has the reins**: AI agents are tools. The developer makes final decisions and MUST design the architecture, data models, and APIs. This isn't just about control — it's about preserving and developing the developer's capacity to think deeply about software.

2. **Ask before assuming**: If requirements are ambiguous, the data model is unclear, or there are multiple implementations, ask for clarification immediately. Ask questions to force the user to think deeply about the problem. The goal is insight, not just answers.

3. **Second order reasoning**: Consider second order effects. Ask the user to consider the second order effects of their design decisions. Help them think, don't think for them.

4. **Foster learning**: AI should help developers become better engineers, not create dependency. Explain *why*, not just *what*. When possible, teach the underlying concept.

5. **One task, one session**: Complete one focused task per session. No partial progress across sessions. If a task is too big, break it down first.

6. **Capture learnings**: Record edge cases, gotchas, domain knowledge, and insights. Knowledge in your context window gets lost between sessions — write it down.

7. **No commit without permission**: AI agents never commit or push without explicit approval.

---

## Session Workflow

### 1. START
- Read `.loop-flow/plan/backlog.json` (task pool)
- Read `.loop-flow/plan/progress.txt` (recent history)
- Read `.loop-flow/plan/insights.json` if relevant to current work
- Understand current state
- Propose a task to work on (or ask for direction)

The backlog is a **menu, not a queue** — pick the most valuable task for right now, considering dependencies, priority, and context.

### 2. SELECT
- Choose ONE task to work on
- Consider: dependencies, value, complexity
- This is a **sprint board** model, not a linear queue
- If unclear, ask the developer for direction

### 3. IMPLEMENT
- Work on the selected task
- Follow existing patterns in the codebase
- Keep business logic testable (pure functions where possible)
- If subtasks emerge:
  - **Small/necessary** (< 10 min): Just do them, maybe mention "btw handling X"
  - **Medium** (could be own task): Quick check: "Tackle now or add to backlog?"
  - **Large** (scope creep): Flag and defer: "Adding to backlog, let's stay focused"
  - **Uncertain**: Always ask

### 4. TEST
- Validate your work with tests
- Tests go in `__tests__/` folders near the code they test
- Tests must be human-readable: describe INTENT, not mechanics
- **No commit if tests fail**

### 5. UPDATE
- Update task status in `.loop-flow/plan/backlog.json`
- Append session entry to `.loop-flow/plan/progress.txt`
- Record any learnings in `insights.json` or progress.txt
- Mark if manual QA is required

### 6. HANDOFF
- Session complete
- State is fully captured in backlog + progress + insights
- **Agent does NOT commit** — developer handles git
- Next session starts fresh with full context

---

## File Locations

| Purpose | Location |
|---------|----------|
| Task pool | `.loop-flow/plan/backlog.json` |
| Session history | `.loop-flow/plan/progress.txt` |
| Knowledge graph | `.loop-flow/plan/insights.json` |
| Workflow rules | `.loop-flow/AGENTS.md` (this file) |

---

## Task Schema

```json
{
  "id": "TASK-XXX",
  "title": "Short descriptive title",
  "description": "What needs to be done and why",
  "status": "TODO | IN_PROGRESS | DONE | NEEDS_QA | QA_PASSED | BLOCKED",
  "priority": "high | medium | low",
  "depends_on": ["TASK-YYY"],
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "test_file": "path/to/__tests__/file.test.ts (once written)",
  "notes": "Optional context"
}
```

### Task Types (Prefixes)

| Prefix | Purpose | When to Use |
|--------|---------|-------------|
| `[DESIGN]` | Discussion/decision task | Architecture, data models, API design — think before coding |
| `[IMPL]` | Implementation work | Writing code, tests, documentation |
| `[SPIKE]` | Exploratory research | Reduce uncertainty before committing to an approach |
| `[REVIEW]` | Audit existing code/docs | Code review, TODO triage, documentation audit |
| `[BUG]` | Fix a defect | Something is broken and needs fixing |
| `[DISCUSS]` | Synthesize insights | Deep-dive on unprocessed learnings, link and refine |
| `[DISCOVERY]` | Extract requirements | Rapid Q&A session to gather preferences and decisions |

Design tasks come first — make decisions before coding.

---

## Progress Entry Format

The progress file is both a **session log** and a **learning journal**. Record not just what was done, but what was learned.

```markdown
## YYYY-MM-DD | Session N
Task: TASK-XXX Title
Outcome: COMPLETE | BLOCKED | PARTIAL (reason)
Tests: path/to/test.ts (N passing)
Manual QA: REQUIRED | NOT_REQUIRED

### Summary
What was accomplished in this session.

### Learnings (optional but encouraged)
- Edge case: [non-obvious behavior discovered]
- Domain: [something learned about the problem space]
- Pattern: [useful technique discovered]
- Decision: [architectural choice made and why]

---
```

---

## Learning & Insight Capture

Learnings are first-class entities forming a **knowledge graph**, not just log entries.

### Leverage Hierarchy

Not all learnings are equal. Prioritize higher-leverage insights:

| Type | Leverage | Description | Example |
|------|----------|-------------|---------|
| `process` | Highest | How to work better (meta-learning) | "One task per session prevents context rot" |
| `domain` | High | Problem space knowledge | "Users expect weekly reports on Mondays" |
| `architecture` | Medium-High | Design decisions and rationale | "Chose SQLite for simplicity" |
| `edge_case` | Medium | Non-obvious behavior, test insights | "API returns null for empty arrays" |
| `technical` | Lower | Useful tricks, local knowledge | "Use discriminated unions for state" |

### Two Capture Modes

1. **Quick Capture** — Don't derail the current task
   - Snapshot the insight with minimal detail
   - Mark as `unprocessed` in insights.json
   - Optionally schedule a `[DISCUSS]` task for later synthesis
   - Return to work immediately

2. **Deep Synthesis** — Dedicated discussion time (in a `[DISCUSS]` task)
   - Socratic exploration: why does this matter? what connects?
   - Create links to related insights
   - May synthesize new higher-level insights
   - Mark as `discussed`

### Proactive Capture

AI agents should actively propose when something is worth documenting — don't just silently note things. Ask the developer: "Should we capture this insight?"

Entry points for capture:
- **Prefix trigger**: User says "Note: ..." or "Insight: ..." → agent snapshots immediately
- **Agent notices**: Detects insightful statement → asks "Worth capturing?"
- **Explicit command**: "Capture insight: ..." → formal capture

---

## Conversation Modes

Modes describe how conversation flows. They blend fluidly — agent reads the vibe.

| Mode | Purpose | Style |
|------|---------|-------|
| **Work** | Implementing, coding | Focused, efficient, minimal meta-commentary |
| **Discovery** | Extract requirements | Rapid Q&A with choices, breadth over depth |
| **Discuss** | Explore one insight | Socratic, deep, builds understanding |
| **Review** | Audit what exists | Evaluative, critical |

**Mode transitions are fluid** — no rigid state machine. Agent adapts naturally:
- "Wait, why are we doing it this way?" → shifts to Discuss
- "What are the options here?" → shifts to Discovery
- "Ok let's just do it" → shifts to Work
- "Show me what's there" → shifts to Review

**Important**: In Work mode, avoid meta-commentary to preserve context budget. In other modes, naming the shift can help orient the conversation.

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
- Something should be added to progress.txt learnings or insights.json
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
- **Don't** assume user intent — ask when uncertain
- **Don't** commit or push without permission
- **Don't** use context compaction (causes context rot)
- **Don't** treat the backlog as a queue — it's a menu

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

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
````

---

## USER TUTORIAL

After scaffolding, explain this to the user:

### What is Loop-Flow?

Loop-Flow is a structured workflow for AI-assisted development. Brought to you by your friendly dev, Jorge.

It solves the problem of **context rot** — when AI assistants lose track of what they're doing in long sessions, or when knowledge gets lost between sessions.

But there's a deeper goal: **Loop-Flow helps you become a better engineer**, not just ship faster. In a world of "vibe coding" where AI does the thinking, Loop-Flow keeps you in the driver's seat. AI is powerful, but over-reliance is dangerous — it atrophies your ability to think deeply, which is fundamental to being human and being a great engineer.

The core idea: **one task, one session, one handoff** — with the human firmly in control.

### The Loop

Every work session follows this pattern:

```
1. START    → Agent reads backlog + recent progress, proposes a task
2. SELECT   → You pick ONE task to work on
3. IMPLEMENT → Work on that task (agent helps)
4. TEST     → Validate with tests
5. UPDATE   → Record what happened, capture learnings
6. HANDOFF  → Session ends with state fully captured
```

### Why One Task?

Large sessions cause "context rot" — the AI loses track of what it's doing. Small, focused tasks stay clean. If a task feels too big, break it down into smaller tasks first.

### The Backlog is a Menu

Your backlog isn't a queue you process in order. It's a **menu** of options. Each session, pick the most valuable task for *right now* based on:
- What's blocking other work
- What you're in the mood for
- What context you already have loaded

### Learnings Are Gold

When you discover something non-obvious during a session:
- An edge case that surprised you
- A domain rule you didn't know
- A useful pattern or technique
- A decision and why you made it

**Write it down.** Future sessions benefit from past learnings. The AI won't remember — the files will.

### The Real Goal: Growth

The code is just the artifact. The real product is **the understanding in your head**.

Every session should leave you knowing something you didn't know before — about the problem, the technology, or software engineering itself. If AI is doing all the thinking, you're not growing. Use AI to explore options faster, but make sure *you* understand the decisions.

### Task Types

| Type | When to Use |
|------|-------------|
| `[DESIGN]` | Think before coding — architecture, APIs, data models |
| `[IMPL]` | Actually building stuff |
| `[SPIKE]` | Research to reduce uncertainty |
| `[REVIEW]` | Audit existing code or docs |
| `[BUG]` | Fix something broken |
| `[DISCUSS]` | Deep-dive on an insight, link it to others |
| `[DISCOVERY]` | Rapid Q&A to extract requirements |

### Quick Commands

- **Start a session**: "Let's start a session" or "Read the backlog and suggest a task"
- **Add a task**: "Add a new task: [description]"
- **Capture an insight**: "Note: [insight]" or "Capture insight: [insight]"
- **End a session**: "Let's wrap up" or "Update the backlog and log this session"

### Disabling Loop-Flow

To temporarily disable:
1. Open your root `AGENTS.md`
2. Comment out or delete the line: `**At the start of every session**, read .loop-flow/AGENTS.md...`

To re-enable, restore that line.

### Your Files

After scaffolding, your project has:

| File | Purpose |
|------|---------|
| `.loop-flow/AGENTS.md` | Workflow rules (agent reads at session start) |
| `.loop-flow/plan/backlog.json` | Your task pool |
| `.loop-flow/plan/progress.txt` | Session history and learnings |
| `.loop-flow/plan/insights.json` | Structured knowledge graph |
| Root `AGENTS.md` | Now includes Loop-Flow init instruction |

---

## After Scaffolding

Delete this file (`LOOP-FLOW-BOOTSTRAP.md`) — it's no longer needed.

**Next step**: Add your first task to the backlog and start a session!

A good first task is often `[DESIGN] Define initial architecture` — think before you code.
