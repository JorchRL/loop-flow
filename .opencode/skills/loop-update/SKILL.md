---
name: loop-update
description: Update LoopFlow to the latest version. Fetches LOOP-FLOW-SETUP.md from GitHub and runs the update path.
framework: loop-flow
compatibility: opencode
---

# Update LoopFlow

You are updating LoopFlow to the latest version. Follow these steps:

## Step 1: Check Current Version

Read `.loop-flow/WORKFLOW.md` and extract the version from the header line:
```
**LoopFlow Version:** X.Y.Z
```

If no version found, assume "unknown (pre-0.1.0)".

## Step 2: Fetch Latest LOOP-FLOW-SETUP.md

```bash
curl -sO https://raw.githubusercontent.com/JorchRL/loop-flow/main/LOOP-FLOW-SETUP.md
```

Read the downloaded file and extract the version from line ~5:
```
**Version:** X.Y.Z
```

## Step 3: Compare Versions

Tell the user:
```
Current version: X.Y.Z
Latest version:  X.Y.Z
```

If already on latest:
- "You're already on the latest version."
- Delete the downloaded LOOP-FLOW-SETUP.md
- Done.

If update available, show what's new (read VERSION HISTORY section from SETUP.md).

## Step 4: Confirm Update

Ask: "Update LoopFlow from vX.Y.Z to vX.Y.Z? (yes/no)"

Wait for confirmation.

## Step 5: Run Update Path

Follow the **UPDATE PATH** instructions from LOOP-FLOW-SETUP.md:

1. Replace `.loop-flow/WORKFLOW.md` with the template from SETUP.md
2. Update skills if templates have changed:
   - `.claude/skills/loop-start/SKILL.md`
   - `.claude/skills/loop-end/SKILL.md`
   - `.claude/skills/loop-commit/SKILL.md`
   - `.claude/skills/loop-push/SKILL.md`
   - `.claude/skills/loop-update/SKILL.md`
   - (And corresponding .opencode/ versions)
3. Optionally offer to import new process insights

**DO NOT modify:**
- `.loop-flow/plan/backlog.json`
- `.loop-flow/plan/progress.txt`
- `.loop-flow/plan/insights.json` (unless importing new insights with user permission)

## Step 6: Clean Up

```bash
rm LOOP-FLOW-SETUP.md
```

## Step 7: Report

Tell the user:
```
LoopFlow updated: vX.Y.Z → vX.Y.Z

Updated:
- .loop-flow/WORKFLOW.md
- Skills (if changed)

Preserved:
- backlog.json
- progress.txt
- insights.json

See VERSION HISTORY in LOOP-FLOW-SETUP.md for full changelog.
```

---

## Safety Notes

- Never modify project state files (backlog, progress, insights) without permission
- If update fails mid-way, the old files are still intact (we replace, not patch)
- User can always re-run `/loop-update` if something goes wrong
