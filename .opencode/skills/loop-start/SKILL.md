---
name: loop-start
description: Start a LoopFlow session. Reads workflow rules, backlog, progress, and insights to understand current state and propose a task.
framework: loop-flow
compatibility: opencode
---

# Start LoopFlow Session

You are starting a LoopFlow development session. Follow these steps exactly:

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
