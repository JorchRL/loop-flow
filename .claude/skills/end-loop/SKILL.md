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
