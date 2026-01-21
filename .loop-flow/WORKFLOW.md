# Loop-Flow Workflow Rules

**Loop-Flow Version:** 0.7.0

This file defines how AI agents should work in this repository using the Loop-Flow methodology.

Loop-Flow is a **theory preservation system** (ref: Naur's "Programming as Theory Building"). The code is the artifact, but the theory in your head is the real product. This workflow helps capture that theory before it's lost.

---

## Core Principles

1. **Developer has the reins**: The developer is in charge. AI agents are tools to help. The developer makes final decisions and MUST design the architecture, data models, and APIs. This isn't just about control — it's about preserving and developing the developer's capacity to think deeply about software.

2. **Ask Questions Before Implementing**: If the requirement is ambiguous, the data model is unclear, or there are multiple implementations, ask for clarification immediately. Ask questions to force the user to think deeply about the problem. The goal is insight, not just answers.

3. **Second order reasoning**: Consider second order effects. Ask the user to consider the second order effects of their design decisions. Help them think, don't think for them.

4. **Foster Learning**: AI should help developers become better engineers, not create dependency. Explain *why*, not just *what*. When possible, teach the underlying concept.

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
- Run tests: `npm test`
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
| Design docs | `docs/` |

---

## Task ID Convention

Use prefix `LF-XXX` for all Loop-Flow tasks.

---

## Task Schema

```json
{
  "id": "LF-XXX",
  "title": "Short descriptive title",
  "description": "What needs to be done and why",
  "status": "TODO | IN_PROGRESS | DONE | NEEDS_QA | QA_PASSED | BLOCKED",
  "priority": "high | medium | low",
  "depends_on": ["LF-YYY"],
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
Task: LF-XXX Title
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

## Scope Management

### One Task = One Session
- A backlog task should be completable within one context window
- No partial progress across sessions
- **No context compaction** (causes context rot)

### When Subtasks Emerge
- **Small/necessary**: Just do them within the session
- **Large/optional**: Add to backlog and ask developer for approval
- **Uncertain**: Always ask

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

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
