---
name: loop-bail
description: Emergency exit from a LoopFlow session. Creates RESUME.md for quick pickup. Use when context is running out and you need to exit FAST.
framework: loop-flow
disable-model-invocation: true
---

# Emergency Session Bail

**This is an emergency exit. Do ONE thing: create RESUME.md. No file updates, no questions.**

## Step 1: Create `.loop-flow/RESUME.md`

Create this file immediately:

```markdown
# Session Resume - [Date]

## Context
Task: [TASK-ID or "Ad-hoc: description"]
Status: INTERRUPTED (emergency bail)

## Where We Left Off
[Quick capture of current state - what was being worked on]

## Files in Progress
- [List any files being actively edited]

## Next Steps
1. [Immediate next action when resuming]
2. [Follow-up actions if known]

## Key Context
- [Any critical decisions or state that shouldn't be lost]
- [Anything the next session needs to know]

---
*Created by /loop-bail. Delete after resuming.*
*For full session save, use /loop-end instead.*
```

## Step 2: Confirm

Brief confirmation only:

```
RESUME.md created. Session state captured.

To continue later:
1. Read .loop-flow/RESUME.md
2. Run /loop-start
3. Delete RESUME.md after picking up

Note: backlog.json and progress.txt were NOT updated.
Run /loop-end in your next session for a proper save.
```

## That's It

Do not:
- Update backlog.json
- Append to progress.txt
- Update insights.json
- Ask follow-up questions
- Provide a detailed summary

Speed is the priority. Get out fast.
