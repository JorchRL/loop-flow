# Loop-Flow Update

> Drop this file into any repository using file-based Loop-Flow and ask your AI agent to apply the update.

**Usage:** Copy this file to your project root, then tell your AI agent:
> "Please update Loop-Flow using LOOP-FLOW-UPDATE.md"

**Version:** 0.2.0 (2026-01-18)

---

## AGENT INSTRUCTIONS

When a user asks you to update Loop-Flow using this file, perform the following steps:

### Step 0: Verify existing installation

Check that the project has an existing Loop-Flow installation:
- `.loop-flow/plan/backlog.json` exists
- `.loop-flow/plan/progress.txt` exists
- `.loop-flow/AGENTS.md` exists

If any are missing, tell the user: "This project doesn't have Loop-Flow installed. Use LOOP-FLOW-BOOTSTRAP.md instead."

### Step 1: Backup acknowledgment

Tell the user:
> "I'm about to update your Loop-Flow workflow rules. Your project state (backlog, progress, insights) will NOT be modified. Only the workflow rules in `.loop-flow/AGENTS.md` will be replaced. Proceed?"

Wait for confirmation before continuing.

### Step 2: Replace `.loop-flow/AGENTS.md`

Replace the contents of `.loop-flow/AGENTS.md` with the **TEMPLATE: .loop-flow/AGENTS.md** section below.

Do NOT modify:
- `.loop-flow/plan/backlog.json`
- `.loop-flow/plan/progress.txt`
- `.loop-flow/plan/insights.json`

### Step 3: Check insights.json schema

If `.loop-flow/plan/insights.json` exists but doesn't have `link_types`, add them:

```json
"link_types": {
  "builds_on": "This insight extends or deepens another",
  "contradicts": "This insight challenges or refines another",
  "exemplifies": "This is a concrete example of an abstract insight",
  "synthesizes": "This insight was created by combining others"
}
```

### Step 4: Offer to add process insights

Ask the user:
> "This update includes some process insights from Loop-Flow development. Would you like me to add them to your insights.json? They're about how to work better with AI agents."

If yes, append the insights from **PROCESS INSIGHTS TO IMPORT** section below to their `insights.json`, adjusting IDs to not conflict with existing ones.

### Step 5: Delete this update file

```bash
rm LOOP-FLOW-UPDATE.md
```

### Step 6: Summarize what changed

Tell the user what's new in this version (see **CHANGELOG** section).

---

## CHANGELOG

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

## TEMPLATE: .loop-flow/AGENTS.md

Replace `.loop-flow/AGENTS.md` with this content:

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

## PROCESS INSIGHTS TO IMPORT

These are high-leverage process insights from Loop-Flow development. Import them if you want to benefit from what we've learned about working with AI agents.

When importing, assign new IDs that don't conflict with existing insights (e.g., if your highest ID is INS-005, start at INS-006).

```json
[
  {
    "id": "INS-IMPORT-001",
    "content": "Modes are internal vibes the agent spontaneously takes based on context. Tasks are explicit activities requested by the user or proposed by the agent. Modes are fluid and blend; tasks are discrete and trackable. The agent doesn't announce mode switches — it reads the room and adapts.",
    "type": "process",
    "status": "discussed",
    "tags": ["process", "modes", "tasks", "loop-flow-philosophy"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow development"
  },
  {
    "id": "INS-IMPORT-002",
    "content": "Learn mode: acquiring external knowledge and grounding it in the project's context. Has a grounding topic (docs, library, domain) that we orbit around. Divergences happen when something sparks — agent notices and gently grounds back. Produces: understanding, insights, AND design refinements. Distinct from Discovery (focused requirements extraction) and Discuss (philosophical back-and-forth on insights).",
    "type": "process",
    "status": "discussed",
    "tags": ["process", "modes", "learning", "loop-flow-philosophy"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow development"
  },
  {
    "id": "INS-IMPORT-003",
    "content": "When teaching domain concepts, provide probing questions alongside the explanation. Questions guide active reading and help the learner build their own mental model rather than passively absorbing information.",
    "type": "process",
    "status": "discussed",
    "tags": ["teaching", "learning", "ai-agent-patterns"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow development"
  },
  {
    "id": "INS-IMPORT-004",
    "content": "AI should proactively probe for emerging insights during conversation. When an idea starts floating around but isn't yet articulated, steer toward surfacing it. Don't wait for the user to explicitly say 'let's capture this' — notice the nascent insight and help bring it into focus. This is active theory extraction, not passive note-taking.",
    "type": "process",
    "status": "discussed",
    "tags": ["ai-agent-patterns", "insight-capture", "proactive", "theory-building"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow development"
  },
  {
    "id": "INS-IMPORT-005",
    "content": "Learning and discovery are not sequential phases — they blend together in a generative loop. The agent's input prompts the human to think deeper about the domain, which surfaces new insights, which the agent helps articulate, which prompts further thinking. This co-creative dialogue is key. The agent isn't just extracting knowledge — it's catalyzing knowledge creation.",
    "type": "process",
    "status": "discussed",
    "tags": ["process", "learning", "discovery", "co-creation", "dialogue"],
    "links": [],
    "created": "2026-01-18",
    "source": "Loop-Flow development"
  }
]
```

---

## After Updating

Delete this file (`LOOP-FLOW-UPDATE.md`) — it's no longer needed.

Your project state (backlog, progress, insights) is preserved. Only the workflow rules have been updated.

To see what's new, check the CHANGELOG section above.
