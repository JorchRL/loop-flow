# Scaffolding the Loop-Flow Workflow

This guide helps you set up the file-based Loop-Flow workflow in any repository. This is the manual approach that works today, before the MCP server automates it.

---

## Step 1: Create the Folder Structure

```bash
# Navigate to your project root
cd /path/to/your/project

# Create the workflow folder
mkdir -p .agents/plan
```

## Step 2: Add to .gitignore

Add this line to your `.gitignore`:

```
# Local AI workflow (personal, not shared)
.agents/
```

> **Why gitignore?** The `.agents/` folder is your personal workflow state. It's not shared with the team. Your committed `AGENTS.md` in the repo root contains the shared team rules.

---

## Step 3: Create the Backlog File

Create `.agents/plan/backlog.json`:

```json
{
  "project": "YOUR_PROJECT_NAME",
  "last_updated": "YYYY-MM-DD",
  "notes": "Initial backlog",
  "tasks": []
}
```

---

## Step 4: Create the Progress File

Create `.agents/plan/progress.txt`:

```markdown
# YOUR_PROJECT_NAME Development Progress

This file is an append-only log of development sessions **and learnings**.

- **Session log**: What was done, outcomes, blockers
- **Learning journal**: Edge cases, domain knowledge, tricks

---
```

---

## Step 5: Create the Agent Rules File

Create `AGENTS.md` in your **repo root** (this one IS committed):

```markdown
# Project Agent Rules

## Project Overview

Brief description of what this project is and its tech stack.

---

## Workflow Rules

1. **Developer has the reins**: AI agents are tools. You make final decisions.

2. **Ask Questions Before Implementing**: If requirements are ambiguous, ask.

3. **AI Agents**: Never commit or push without permission.

---

## Coding Standards

- TypeScript strict mode
- No `any` types
- Pure functions for business logic
- Tests for critical paths

---

## Local Workflow

This project uses the Loop-Flow workflow for AI-assisted sessions.

### Session Start
1. Read `.agents/plan/backlog.json`
2. Read `.agents/plan/progress.txt` (recent entries)
3. Understand current state

### Session Flow
- One task per session
- Tests must pass before completion
- Update backlog and progress at end

### File Locations

| Purpose | Location |
|---------|----------|
| Task pool | `.agents/plan/backlog.json` |
| Session history | `.agents/plan/progress.txt` |

---

## Communication Protocol

### Always Ask When:
- Scope is ambiguous
- Trade-offs need input
- Adding significant new tasks

### Always Note When:
- Manual QA is required
- Architectural decisions made
- Learnings discovered

---

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
```

Customize this template for your project's specific tech stack and conventions.

---

## Step 6: Add Your First Task

Edit `.agents/plan/backlog.json` to add a task:

```json
{
  "project": "My Project",
  "last_updated": "2026-01-17",
  "notes": "Getting started with Loop-Flow",
  "tasks": [
    {
      "id": "TASK-001",
      "title": "[DESIGN] Define initial architecture",
      "description": "Discuss and document the initial project architecture",
      "status": "TODO",
      "priority": "high",
      "acceptance_criteria": [
        "Key components identified",
        "Data flow documented",
        "Tech decisions recorded"
      ]
    }
  ]
}
```

---

## How to Use the Workflow

### Starting a Session

When you start working with an AI assistant, it should:

1. Read the backlog to see available tasks
2. Read recent progress to understand context
3. Propose a task to work on (or ask for direction)

**Example prompt to start:**

> "Read the backlog and progress files, then suggest which task we should work on."

### During a Session

Work on ONE task. If new subtasks emerge:

- **Small/necessary** → Just do them
- **Large/optional** → Add to backlog, ask permission
- **Uncertain** → Always ask

### Ending a Session

The AI should:

1. Update the task status in `backlog.json`
2. Append an entry to `progress.txt`
3. Note any learnings discovered

**Example session entry:**

```markdown
## 2026-01-17 | Session 1
Task: TASK-001 [DESIGN] Define initial architecture
Outcome: COMPLETE
Manual QA: NOT_REQUIRED

### Summary
Discussed and documented the initial architecture. Key decisions:
- Using Next.js App Router for the frontend
- PostgreSQL with Prisma for data layer
- Server actions for mutations

### Learnings
- Decision: Chose server actions over API routes for simpler mental model
- Pattern: Keep database queries in a separate `db/` folder

---
```

---

## Task Schema Reference

```json
{
  "id": "TASK-XXX",
  "title": "Short descriptive title",
  "description": "What needs to be done and why",
  "status": "TODO | IN_PROGRESS | DONE | NEEDS_QA | QA_PASSED | BLOCKED",
  "priority": "high | medium | low",
  "depends_on": ["TASK-YYY"],
  "acceptance_criteria": [
    "Criterion 1",
    "Criterion 2"
  ],
  "test_file": "path/to/__tests__/file.test.ts",
  "notes": "Optional additional context"
}
```

### Task Prefixes

| Prefix | Use For |
|--------|---------|
| `[DESIGN]` | Discussion/decision tasks |
| `[IMPL]` | Implementation work |
| `[SPIKE]` | Exploratory research |
| `[REVIEW]` | Auditing existing code |
| `[BUG]` | Fixing defects |

---

## Progress Entry Format

```markdown
## YYYY-MM-DD | Session N
Task: TASK-XXX Title
Outcome: COMPLETE | BLOCKED | PARTIAL (reason)
Tests: path/to/test.ts (N passing)
Manual QA: REQUIRED | NOT_REQUIRED

### Summary
What was accomplished in this session.

### Learnings
- Edge case: [non-obvious behavior]
- Domain: [problem space knowledge]
- Pattern: [useful technique]
- Decision: [choice made and why]
- Gotcha: [thing that tripped us up]

---
```

---

## Tips for Success

### For You (The Developer)

1. **Start with a design task** — Think before coding
2. **Keep tasks small** — If it feels big, break it down
3. **Review AI output critically** — You're the engineer
4. **Capture learnings** — Future you will thank you

### For the AI Assistant

Include this in your AGENTS.md so the AI knows:

1. **Read before writing** — Understand existing patterns
2. **Ask before assuming** — Scope clarity prevents rework
3. **One task only** — Stay focused
4. **Update state** — Keep backlog and progress in sync

### Common Pitfalls

| Mistake | Solution |
|---------|----------|
| Tasks too vague | Add specific acceptance criteria |
| Skipping progress log | Make it part of session end ritual |
| Too many tasks at once | Pick ONE, complete it fully |
| Not capturing learnings | Ask "what did we learn?" |

---

## Migrating to MCP Server (Future)

When the Loop-Flow MCP server is ready:

```bash
# Install
npm install -g loop-flow

# Migrate existing workflow
loop-flow migrate \
  --backlog .agents/plan/backlog.json \
  --progress .agents/plan/progress.txt

# The MCP server now manages your workflow
# AI tools call loop.start / loop.end instead of reading files
```

Your history and learnings are preserved.

---

## Example: Complete Workflow

### Day 1: Setup

```bash
mkdir -p .agents/plan
echo '.agents/' >> .gitignore
# Create backlog.json and progress.txt as shown above
# Create AGENTS.md in repo root
```

### Day 1: First Session

**You:** "Let's start a session. Read the backlog and suggest a task."

**AI:** *reads files* "I see TASK-001 is a design task for initial architecture. Want to start there?"

**You:** "Yes, let's discuss the architecture."

*... design discussion happens ...*

**AI:** "I'll update the backlog to mark TASK-001 as DONE and log this session."

*AI updates backlog.json status, appends to progress.txt*

### Day 2: Implementation

**You:** "New session. What should we work on?"

**AI:** *reads files* "Yesterday we completed the architecture design. I see TASK-002 is implementing the database schema. That seems like the logical next step."

**You:** "Let's do it."

*... implementation happens ...*

---

## Questions?

This workflow is designed to evolve. If something isn't working:

1. Note it in your progress.txt learnings
2. Adjust your AGENTS.md rules
3. The MCP server will eventually automate the painful parts

---

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
