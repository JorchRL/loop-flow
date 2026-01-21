---
name: loop-end
description: End a LoopFlow session gracefully. Updates backlog, progress, and insights. Use when wrapping up a session or hitting context limits.
framework: loop-flow
compatibility: opencode
---

# End LoopFlow Session

**CRITICAL: SAVE STATE FIRST.** This may be an emergency handoff. Do the file updates BEFORE anything else.

## Step 1: IMMEDIATELY Save State (Do This First!)

You MUST update these files right now, before any summary or discussion:

### 1a. Update `.loop-flow/plan/backlog.json`
- Read the current file first
- Update task status (DONE, IN_PROGRESS, BLOCKED, etc.)
- Update `last_updated` date to today
- Update `notes` field with current state summary
- Add any new tasks that emerged during the session

### 1b. Append to `.loop-flow/plan/progress.txt`
- Read the current file to get the next session number
- Append this format:

```markdown
## YYYY-MM-DD | Session N
Task: [TASK-ID] [Title] (or "Ad-hoc: [description]" if no formal task)
Outcome: COMPLETE | PARTIAL | BLOCKED (reason)
Tests: [path if applicable] (N passing)
Manual QA: REQUIRED | NOT_REQUIRED

### Summary
[2-3 sentences on what was accomplished]

### Learnings (if any)
- [Edge case, domain knowledge, or pattern discovered]

---
```

### 1c. Update `.loop-flow/plan/insights.json` (if new insights emerged)
- Add new insights with proper IDs (increment from last INS-XXX)
- Mark status as `unprocessed` for quick captures
- Include source task and session info

## Step 2: Verify Saves Completed

**CHECKPOINT — Confirm you actually wrote to these files:**
- [ ] backlog.json updated
- [ ] progress.txt appended
- [ ] insights.json updated (if applicable)

If you haven't done ALL of these, STOP and do them now.

## Step 3: Handle Context Emergency (if applicable)

If context is running low and task is incomplete, ALSO create `.loop-flow/RESUME.md`:

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

---
*Delete this file after resuming*
```

## Step 4: Confirm with User

Show what was updated:
```
## Session Saved
- backlog.json: [what changed]
- progress.txt: Session N added
- insights.json: [INS-XXX added / no new insights]
```

Remind them: **Agent does NOT commit — developer handles git.**

Options:
- `git add . && git commit -m "..."` — if they want to commit
- Start new session with `/loop-start`

---

## Skip Condition

If the user calls /loop-end but no meaningful work was done this session (e.g., just started and immediately ending, or calling end-loop twice), acknowledge this and skip the updates:

"No session state to save — no work was done since the last save."
