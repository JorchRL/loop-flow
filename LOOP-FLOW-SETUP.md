# Loop-Flow Setup

> The single file for bootstrapping or updating Loop-Flow in any repository.

**Version:** 0.7.0 (2026-01-20)

**Usage:** Copy this file to your project root, then tell your AI agent:
> "Please set up Loop-Flow using LOOP-FLOW-SETUP.md"

The agent will auto-detect whether to bootstrap fresh or update an existing installation.

---

## AGENT INSTRUCTIONS

When a user asks you to set up Loop-Flow using this file, perform the following steps:

### Step 0: Detect installation state

Check if `.loop-flow/` exists with these files:
- `.loop-flow/plan/backlog.json`
- `.loop-flow/plan/progress.txt`
- `.loop-flow/WORKFLOW.md`

**If ALL exist** → Follow the **UPDATE PATH** (Step U1-U6)
**If ANY are missing** → Follow the **BOOTSTRAP PATH** (Step B1-B9)

---

# BOOTSTRAP PATH (Fresh Install)

### Step B1: Determine project name

Ask the user for the project name, or infer it from the folder name (e.g., `~/projects/my-app` → "My App").

Use this name to replace `PROJECT_NAME` in all templates below.

### Step B2: Create the folder structure

```bash
mkdir -p .loop-flow/plan
```

### Step B3: Create `.loop-flow/plan/backlog.json`

```json
{
  "project": "PROJECT_NAME",
  "last_updated": "YYYY-MM-DD",
  "notes": "Initial backlog - ready for first task",
  "tasks": []
}
```

### Step B4: Create `.loop-flow/plan/progress.txt`

```markdown
# PROJECT_NAME Development Progress

This file is an append-only log of development sessions **and learnings**.

- **Session log**: What was done, outcomes, blockers
- **Learning journal**: Edge cases, domain knowledge, tricks, non-obvious behaviors

---
```

### Step B5: Create `.loop-flow/plan/insights.json`

Use the **TEMPLATE: insights.json** section below.

### Step B6: Create `.loop-flow/WORKFLOW.md`

Use the **TEMPLATE: .loop-flow/WORKFLOW.md** section below.

### Step B7: Update the root `AGENTS.md`

If the project has a root `AGENTS.md` file:
- **Append** the Loop-Flow initialization instruction (see "APPEND TO ROOT AGENTS.md" section)
- Do NOT overwrite existing content

If no root `AGENTS.md` exists:
- Create one with minimal content plus the initialization instruction

### Step B8: Add to `.gitignore`

Add this line to `.gitignore` (create if needed):

```
# Loop-Flow workflow state (personal, not committed)
.loop-flow/
```

### Step B9: Install Skills (Optional but Recommended)

Create skills for session management. These work in Claude Code, OpenCode, and tools supporting the Agent Skills standard.

**For Claude Code** (`.claude/skills/`):
```bash
mkdir -p .claude/skills/start-loop .claude/skills/end-loop
```

**For OpenCode** (`.opencode/skills/`):
```bash
mkdir -p .opencode/skills/start-loop .opencode/skills/end-loop
```

Create `SKILL.md` files using the **SKILL TEMPLATES** section below.

### Step B10: Delete this setup file and give tutorial

```bash
rm LOOP-FLOW-SETUP.md
```

After scaffolding, explain the key concepts using the **USER TUTORIAL** section below.

---

# UPDATE PATH (Existing Installation)

### Step U1: Confirm update

Tell the user:
> "Loop-Flow detected (version X or unknown). I'll update to v0.7.0. Your project state (backlog, progress, insights) will NOT be modified. Only the workflow rules in `.loop-flow/WORKFLOW.md` will be replaced. Proceed?"

Wait for confirmation.

### Step U2: Replace `.loop-flow/WORKFLOW.md`

Replace contents with the **TEMPLATE: .loop-flow/WORKFLOW.md** section below.

If the file is still named `.loop-flow/AGENTS.md` (from v0.3.0 or earlier), rename it to `.loop-flow/WORKFLOW.md`.

Do NOT modify:
- `.loop-flow/plan/backlog.json`
- `.loop-flow/plan/progress.txt`
- `.loop-flow/plan/insights.json`

### Step U3: Check insights.json schema

If `.loop-flow/plan/insights.json` exists but doesn't have `link_types`, add them from the **TEMPLATE: insights.json** section.

### Step U4: Offer to import process insights

Ask the user:
> "This update includes process insights from Loop-Flow development (v0.3.0 additions). Would you like me to add them to your insights.json? They're about how to work better with AI agents."

If yes, append insights from **LOOP-FLOW PROCESS INSIGHTS** section, adjusting IDs to not conflict with existing ones.

### Step U5: Delete this setup file

```bash
rm LOOP-FLOW-SETUP.md
```

### Step U6: Summarize what changed

Tell the user what's new (see **VERSION HISTORY** section).

---

## APPEND TO ROOT AGENTS.md

Add this block to the **end** of the existing root `AGENTS.md`:

```markdown

---

## Loop-Flow Workflow

This project uses the Loop-Flow workflow for AI-assisted development sessions.

**At the start of every session**, read `.loop-flow/WORKFLOW.md` for workflow instructions.

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

**At the start of every session**, read `.loop-flow/WORKFLOW.md` for workflow instructions.

To temporarily disable Loop-Flow, comment out or delete the line above.
```

---

## TEMPLATE: insights.json

```json
{
  "schema_version": "0.1.0",
  "loop_flow_version": "0.7.0",
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

---

## TEMPLATE: .loop-flow/WORKFLOW.md

Create or replace `.loop-flow/WORKFLOW.md` with this content:

````markdown
# Loop-Flow Workflow Rules

**Loop-Flow Version:** 0.7.0

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
| Workflow rules | `.loop-flow/WORKFLOW.md` (this file) |

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
| `[IMPL]` | Implementation work | Writing code, tests, documentation |
| `[DESIGN]` | Discussion/decision task | Architecture, data models, API design — think before coding |
| `[SPIKE]` | Exploratory research | Reduce *our own* uncertainty before committing to an approach |
| `[LEARN]` | Acquire external knowledge | Understand docs, libraries, domains — external knowledge acquisition |
| `[REVIEW]` | Audit existing code/docs | Code review, TODO triage, documentation audit |
| `[BUG]` | Fix a defect | Something is broken and needs fixing |
| `[DISCUSS]` | Synthesize insights | Deep-dive on unprocessed learnings, link and refine |
| `[DISCOVERY]` | Extract requirements | Rapid Q&A session to gather preferences and decisions |

**Note**: `[SPIKE]` and `[LEARN]` often blend. A spike may require learning, and learning may surface spikes.

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

AI agents should **proactively probe for emerging insights** during conversation. When an idea starts floating around but isn't yet articulated, steer toward surfacing it. This is active theory extraction, not passive note-taking.

Entry points for capture:
- **Prefix trigger**: User says "Note: ..." or "Insight: ..." → agent snapshots immediately
- **Agent notices**: Detects insightful statement → asks "Worth capturing?"
- **Agent probes**: Notices emerging idea → helps articulate it

---

## Conversation Modes

Modes are internal vibes the agent spontaneously adopts based on context — not explicit commands. The agent reads the room and adapts. Modes blend fluidly.

| Mode | Purpose | Style | Primary Output |
|------|---------|-------|----------------|
| **Work** | Implementing, coding | Focused, efficient, minimal meta-commentary | Code, tests |
| **Discovery** | Extract requirements | Rapid Q&A with choices, breadth over depth | Requirements |
| **Discuss** | Explore one insight deeply | Socratic, philosophical back-and-forth | Insights |
| **Learn** | Acquire external knowledge | Teaching, questioning, synthesizing | Understanding + insights + refined requirements |
| **Review** | Audit what exists | Evaluative, critical | Assessments, improvements |

### Learn Mode

Learn mode is distinct: it has a **grounding topic** (docs, library, domain) that the conversation orbits around. Divergences happen when something sparks — agent notices and gently grounds back ("ready to return to X?"). Learn mode produces understanding, insights, AND design refinements. It's where external knowledge meets project context.

### Mode Transitions

- Fluid blending, no explicit switches
- Agent can name shifts when helpful — EXCEPT in Work mode (preserve context budget)
- Modes often blend — e.g., Learn can spark Discuss on a specific insight, then return to Learn
- Examples:
  - "Wait, why are we doing it this way?" → shifts to Discuss
  - "What are the options here?" → shifts to Discovery
  - "Teach me about X" or "Let's research Y" → shifts to Learn
  - "Ok let's just do it" → shifts to Work
  - "Show me what's there" → shifts to Review

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
- You notice an emerging idea that should be articulated

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

## LOOP-FLOW PROCESS INSIGHTS

These are high-leverage process insights from Loop-Flow development. They represent core Loop-Flow methodology and should be imported during updates to carry forward the latest thinking.

When importing, assign new IDs that don't conflict with existing insights.

```json
[
  {
    "id": "LF-PROC-001",
    "content": "Modes are internal vibes the agent spontaneously takes based on context. Tasks are explicit activities requested by the user or proposed by the agent. Modes are fluid and blend; tasks are discrete and trackable. The agent doesn't announce mode switches — it reads the room and adapts.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "modes", "tasks"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow v0.2.0"
  },
  {
    "id": "LF-PROC-002",
    "content": "Learn mode: acquiring external knowledge and grounding it in the project's context. Has a grounding topic (docs, library, domain) that we orbit around. Divergences happen when something sparks — agent notices and gently grounds back. Produces: understanding, insights, AND design refinements. Distinct from Discovery (focused requirements extraction) and Discuss (philosophical back-and-forth on insights).",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "modes", "learning"],
    "links": ["LF-PROC-001"],
    "created": "2026-01-18",
    "source": "Loop-Flow v0.2.0"
  },
  {
    "id": "LF-PROC-003",
    "content": "When teaching domain concepts, provide probing questions alongside the explanation. Questions guide active reading and help the learner build their own mental model rather than passively absorbing information.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "teaching", "learning", "ai-agent-patterns"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow v0.2.0"
  },
  {
    "id": "LF-PROC-004",
    "content": "AI should proactively probe for emerging insights during conversation. When an idea starts floating around but isn't yet articulated, steer toward surfacing it. Don't wait for the user to explicitly say 'let's capture this' — notice the nascent insight and help bring it into focus. This is active theory extraction, not passive note-taking.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "insight-capture", "proactive", "theory-building"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow v0.2.0"
  },
  {
    "id": "LF-PROC-005",
    "content": "Learning and discovery are not sequential phases — they blend together in a generative loop. The agent's input prompts the human to think deeper about the domain, which surfaces new insights, which the agent helps articulate, which prompts further thinking. This co-creative dialogue is key. The agent isn't just extracting knowledge — it's catalyzing knowledge creation.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "learning", "discovery", "co-creation"],
    "links": ["LF-PROC-002"],
    "created": "2026-01-18",
    "source": "Loop-Flow v0.2.0"
  },
  {
    "id": "LF-PROC-006",
    "content": "Bootstrap/setup files should be unified and versioned. A single file that auto-detects whether to install fresh or update existing reduces confusion and ensures all installations can be brought to the same version. Version at top for quick reference, full changelog for details.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "distribution", "versioning"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow v0.3.0"
  },
  {
    "id": "LF-PROC-007",
    "content": "Spec-driven development: Tests encode the specification. The spec is the source of truth, not the implementation. AI can implement freely because the spec (tests + verification functions) catches violations. This inverts 'code then test' and makes AI-assisted development safer.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "testing", "spec-driven", "ai-assisted"],
    "links": ["LF-PROC-008"],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.5.0"
  },
  {
    "id": "LF-PROC-008",
    "content": "The human's job in AI-assisted development is to write specs that capture what actually matters. The implementation is a consequence of the spec. Expertise lies in knowing what to specify — this is the hard part that AI cannot do.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "testing", "spec-driven", "expertise", "philosophy"],
    "links": ["LF-PROC-007"],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.5.0"
  },
  {
    "id": "LF-PROC-009",
    "content": "Verification functions as a testing pattern: Pure functions that take algorithm output and return true/false + diagnostics. They encode rules/constraints, can be unit tested independently, enable safe AI implementation, and can be reused in production for debugging. Separates 'what is correct' from 'how to compute it'.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "testing", "verification-functions", "patterns"],
    "links": ["LF-PROC-007"],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.5.0"
  },
  {
    "id": "LF-PROC-010",
    "content": "Skills are reusable agent capabilities that encode specific knowledge about how to perform a task. Two types: Core Skills (ship with Loop-Flow, e.g., /version, /session-start) and User-Defined Skills (repo-specific, e.g., /deploy). Skills bridge generic agent capability and project-specific knowledge.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "skills", "extensibility"],
    "links": [],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.5.0"
  },
  {
    "id": "LF-PROC-011",
    "content": "Loop-Flow based learning is effective because: (1) Chat with AI is engaging for ADHD brains — immediate feedback loop, (2) Text-based interaction forces writing, which forces thinking (ref: Zinsser's 'Writing to Learn'). Loop-Flow could be a platform for interactive courses, not just development workflow.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "learning", "adhd", "writing-to-learn", "vision"],
    "links": [],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.5.0"
  },
  {
    "id": "LF-PROC-012",
    "content": "Distributed Discovery: Use AI agents as parallel interviewers to extract tacit knowledge from teams. Embed a MINILOOP.md file (a lightweight, single-file Loop-Flow installation) in a feature branch. Team members interact with the AI interviewer asynchronously, commit their session results, and the lead synthesizes findings. Advantages: no scheduling, less social pressure to 'know the answer', consistent protocol, captures verbatim quotes, scales across team.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "distributed-discovery", "miniloop", "team-knowledge", "interviews"],
    "links": ["LF-PROC-004", "LF-PROC-005"],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.6.0"
  },
  {
    "id": "LF-PROC-013",
    "content": "Risk-focused code review: The value of AI-assisted PR review is risk identification, not style nitpicking. Categorize findings by deployment risk: CRITICAL (must fix before merge — breaks production, data loss, security), MEDIUM (suboptimal but functional, fix later OK), LOW (code style, nice-to-haves). Focus on: What could break in production? What's missing? What assumptions might be wrong?",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "code-review", "pr-review", "risk-assessment"],
    "links": [],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.6.0"
  },
  {
    "id": "LF-PROC-014",
    "content": "Skills provide reliable commands for starting and ending sessions. /start-loop reads .loop-flow/ state directly (no glob failures). /end-loop handles both graceful handoffs (updates backlog, progress, insights) and context emergencies (creates RESUME.md for seamless pickup). Skills follow the Agent Skills standard and work in Claude Code and OpenCode.",
    "type": "process",
    "status": "discussed",
    "tags": ["loop-flow-core", "skills", "session-management", "reliability"],
    "links": ["LF-PROC-010"],
    "created": "2026-01-20",
    "source": "Loop-Flow v0.7.0"
  }
]
```

---

## SKILL TEMPLATES

Skills provide reliable commands for starting and ending sessions. They work with Claude Code, OpenCode, and tools supporting the Agent Skills standard.

### start-loop Skill

Create `<skills-dir>/start-loop/SKILL.md`:

````markdown
---
name: start-loop
description: Start a Loop-Flow session. Reads workflow rules, backlog, progress, and insights to understand current state and propose a task.
---

# Start Loop-Flow Session

You are starting a Loop-Flow development session. Follow these steps exactly:

## Step 1: Read Core Files (Required)

Use the Read tool to read these files. Do NOT use Glob or search tools — read directly:

1. `.loop-flow/WORKFLOW.md` — The workflow rules (read this first)
2. `.loop-flow/plan/backlog.json` — The task pool
3. `.loop-flow/plan/progress.txt` — Recent session history
4. `.loop-flow/plan/insights.json` — Knowledge graph (skim for relevant insights)

## Step 2: Understand Current State

After reading, identify:
- What was the last session about?
- What tasks are IN_PROGRESS, TODO, or BLOCKED?
- Any unprocessed insights that need attention?

## Step 3: Propose Next Steps

Present a concise summary to the user:

```
## Current State
- Last session: [brief summary]
- Active task: [if any IN_PROGRESS]

## Suggested Tasks (pick one)
1. [Task ID] [Title] - [why now]
2. [Task ID] [Title] - [why now]
3. [Or ask for direction]
```

Remember: The backlog is a **menu, not a queue**. Suggest based on value, dependencies, and context.

## Important

- Do NOT commit or push without explicit permission
- One task per session
- If a task seems too large, propose breaking it down first
````

### end-loop Skill

Create `<skills-dir>/end-loop/SKILL.md`:

````markdown
---
name: end-loop
description: End a Loop-Flow session gracefully. Updates backlog, progress, and insights. Use when wrapping up a session or hitting context limits.
---

# End Loop-Flow Session

You are ending a Loop-Flow session. Determine which type of ending this is:

## Type A: Graceful Handoff (task complete or natural stopping point)

Perform ALL of these updates:

### 1. Update `.loop-flow/plan/backlog.json`
- Update task status (DONE, IN_PROGRESS, BLOCKED, etc.)
- Update `last_updated` date
- Update `notes` field with current state summary
- Add any new tasks that emerged during the session

### 2. Append to `.loop-flow/plan/progress.txt`
Use this format:

```markdown
## YYYY-MM-DD | Session N
Task: [TASK-ID] [Title]
Outcome: COMPLETE | PARTIAL | BLOCKED (reason)
Tests: [path if applicable] (N passing)
Manual QA: REQUIRED | NOT_REQUIRED

### Summary
[2-3 sentences on what was accomplished]

### Learnings (if any)
- [Edge case, domain knowledge, or pattern discovered]

---
```

### 3. Update `.loop-flow/plan/insights.json` (if new insights emerged)
- Add new insights with proper IDs (increment from last INS-XXX)
- Mark status as `unprocessed` for quick captures
- Include source task and session info

### 4. Confirm with user
Show what was updated and remind: **Agent does NOT commit — developer handles git.**

---

## Type B: Context Emergency (hitting limits, need to stop mid-task)

When context is running low and task is incomplete:

### 1. Create `.loop-flow/RESUME.md` (temporary file)

```markdown
# Session Resume - [Date]

## Context
Task: [TASK-ID] [Title]
Status: IN_PROGRESS (interrupted)

## Where We Left Off
[Specific description of current state]
- Files being edited: [list]
- Current step: [what was being done]
- Next step: [what to do next]

## Key Decisions Made
- [Any decisions that shouldn't be re-discussed]

## Open Questions
- [Anything unresolved]

## To Continue
1. Read this file first
2. Then run /start-loop
3. Continue from "Next step" above

---
*Delete this file after resuming*
```

### 2. Quick update to backlog.json
- Mark task as IN_PROGRESS
- Add note: "Interrupted - see .loop-flow/RESUME.md"

### 3. Notify user
Tell them: "Session saved to RESUME.md. Next session will pick up where we left off."

---

## After Ending

Remind the user of their options:
- `git add . && git commit -m "..."` — if they want to commit
- `git push` — only if they explicitly want to push
- Start new session with `/start-loop`
````

### Skill Locations by Tool

| Tool | Location |
|------|----------|
| Claude Code | `.claude/skills/<name>/SKILL.md` |
| OpenCode | `.opencode/skills/<name>/SKILL.md` |
| Global (Claude Code) | `~/.claude/skills/<name>/SKILL.md` |
| Global (OpenCode) | `~/.config/opencode/skills/<name>/SKILL.md` |

---

## USER TUTORIAL

After bootstrapping, explain this to the user:

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
| `[LEARN]` | Acquire external knowledge (docs, libraries, domains) |
| `[REVIEW]` | Audit existing code or docs |
| `[BUG]` | Fix something broken |
| `[DISCUSS]` | Deep-dive on an insight, link it to others |
| `[DISCOVERY]` | Rapid Q&A to extract requirements |

### Quick Commands

If you installed the skills (recommended):
- **Start a session**: `/start-loop`
- **End a session**: `/end-loop`

Without skills:
- **Start a session**: "Let's start a session" or "Read the backlog and suggest a task"
- **End a session**: "Let's wrap up" or "Update the backlog and log this session"

Other commands:
- **Add a task**: "Add a new task: [description]"
- **Capture an insight**: "Note: [insight]" or "Capture insight: [insight]"

### Disabling Loop-Flow

To temporarily disable:
1. Open your root `AGENTS.md`
2. Comment out or delete the line: `**At the start of every session**, read .loop-flow/WORKFLOW.md...`

To re-enable, restore that line.

### Your Files

After setup, your project has:

| File | Purpose |
|------|---------|
| `.loop-flow/WORKFLOW.md` | Workflow rules (agent reads at session start) |
| `.loop-flow/plan/backlog.json` | Your task pool |
| `.loop-flow/plan/progress.txt` | Session history and learnings |
| `.loop-flow/plan/insights.json` | Structured knowledge graph |
| Root `AGENTS.md` | Now includes Loop-Flow init instruction |

---

## VERSION HISTORY

### v0.7.0 (2026-01-20)

**Skills System**

- Added `/start-loop` skill: Reliably reads .loop-flow/ state and proposes tasks (no glob failures)
- Added `/end-loop` skill: Two modes — graceful handoff OR context emergency with RESUME.md
- Skills follow Agent Skills standard (works in Claude Code + OpenCode)
- Skill templates included in this file (see SKILL TEMPLATES section)
- Skills live in `.claude/skills/` or `.opencode/skills/` (user's choice)

**1 new process insight**: LF-PROC-014

---

### v0.6.0 (2026-01-20)

**Distributed Discovery & MINILOOP**

- Added Distributed Discovery pattern: using AI agents as parallel interviewers to extract tacit knowledge from teams
- Introduced MINILOOP.md concept: a lightweight, single-file Loop-Flow installation for feature branches
- MINILOOP enables asynchronous "probing" — team members interact with AI interviewer, commit results, lead synthesizes
- Ideal for extracting domain knowledge, validating documented models, discovering edge cases
- Added PR Review Workflow: risk-focused code review pattern (critical/medium/low categorization)
- New docs: `docs/DISTRIBUTED-DISCOVERY.md`, `docs/PR-REVIEW-WORKFLOW.md`

**2 new process insights**: LF-PROC-012, LF-PROC-013

---

### v0.5.0 (2026-01-20)

**Spec-Driven Development & Testing Philosophy**

- Added spec-driven development insights: human writes specs (tests), AI implements
- Human expertise is knowing WHAT to specify — the hard part AI can't do
- Added verification functions pattern: pure functions that validate algorithm output
- Works well with property-based testing for constraint satisfaction problems
- Verification functions serve double duty: test oracles AND production debugging tools

**Skills System Concept**
- Introduced skills as reusable agent capabilities encoding specific knowledge
- Two types: Core Skills (ship with Loop-Flow) and User-Defined Skills (repo-specific)
- Skills bridge generic agent capability and project-specific knowledge

**Loop-Flow as Learning Platform**
- Chat-based learning is ADHD-friendly (immediate feedback loop)
- Writing forces thinking (Zinsser's "Writing to Learn")
- Vision: Loop-Flow could be a platform for interactive courses

**5 new process insights**: LF-PROC-007 to LF-PROC-011

---

### v0.4.0 (2026-01-18)

**Renamed AGENTS.md to WORKFLOW.md**
- Renamed `.loop-flow/AGENTS.md` to `.loop-flow/WORKFLOW.md`
- Avoids confusion with root `AGENTS.md` (repo-specific rules)
- Root `AGENTS.md` = project rules + "read Loop-Flow"
- `.loop-flow/WORKFLOW.md` = Loop-Flow methodology
- Update path now handles renaming from old installations

---

### v0.3.0 (2026-01-18)

**Unified Setup File**
- Merged bootstrap and update into single `LOOP-FLOW-SETUP.md`
- Auto-detects whether to install fresh or update existing
- Version number at top for quick reference
- Full changelog in VERSION HISTORY section

**Process Insights as Feature Carriers**
- Loop-Flow process insights now tagged with `loop-flow-core`
- These carry forward methodology updates between versions
- User's own process insights remain separate (future: better organization)

**New Process Insight**
- LF-PROC-006: Unified versioned setup files

---

### v0.2.0 (2026-01-18)

**New: Learn Mode**
- Added Learn mode for acquiring external knowledge (docs, libraries, domains)
- Learn mode has a "grounding topic" that the conversation orbits around
- Agent notices divergences and gently grounds back
- Produces understanding, insights, AND design refinements

**New: [LEARN] Task Type**
- For acquiring external domain knowledge
- Distinct from [SPIKE] which explores internal uncertainty
- They often blend: spikes may require learning, learning may surface spikes

**Refined: Modes vs Tasks**
- Modes are internal vibes the agent spontaneously adopts
- Tasks are explicit activities requested or proposed
- Modes blend fluidly; tasks are discrete and trackable

**Refined: Conversation Modes**
- All five modes now documented: Work, Discovery, Discuss, Learn, Review
- Each mode has clear purpose, style, and primary output
- Mode transitions are fluid — agent reads the room

**New: Proactive Insight Capture**
- Agent should proactively probe for emerging insights
- When an idea starts forming, steer toward surfacing it
- Active theory extraction, not passive note-taking

---

### v0.1.0 (2026-01-17)

**Initial Release**
- Core workflow: one task, one session, one handoff
- File-based state: backlog.json, progress.txt, insights.json
- Four conversation modes: Work, Discovery, Discuss, Review
- Task types: [IMPL], [DESIGN], [SPIKE], [REVIEW], [BUG], [DISCUSS], [DISCOVERY]
- Insight capture with leverage hierarchy
- Theory preservation philosophy (Naur)

---

## After Setup

Delete this file (`LOOP-FLOW-SETUP.md`) — it's no longer needed.

**For fresh installs**: Add your first task to the backlog and start a session! A good first task is often `[DESIGN] Define initial architecture` — think before you code.

**For updates**: Your project state (backlog, progress, insights) is preserved. Only the workflow rules have been updated. Check VERSION HISTORY to see what's new.
