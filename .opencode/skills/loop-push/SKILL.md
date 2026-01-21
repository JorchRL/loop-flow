---
name: loop-push
description: Push commits to remote repository. Shows what will be pushed and confirms before pushing.
framework: loop-flow
compatibility: opencode
---

# Push to Remote

You are pushing commits to a remote repository. Follow these steps:

## Step 1: Check Current State

Run these commands to understand what will be pushed:

```bash
git status
git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null || git log -5 --oneline
git branch -vv
```

Identify:
- Current branch name
- How many commits ahead of remote
- Whether the branch tracks a remote

## Step 2: Show What Will Be Pushed

Tell the user:
```
Branch: <branch-name>
Remote: <remote/branch>
Commits to push:
  - <hash> <message>
  - <hash> <message>
```

## Step 3: Confirm (for protected branches)

If pushing to `main` or `master`:
- Ask: "You're pushing to <branch>. Confirm? (yes/no)"
- Wait for explicit confirmation

For other branches, proceed directly.

## Step 4: Push

If the branch has no upstream:
```bash
git push -u origin <branch-name>
```

Otherwise:
```bash
git push
```

## Step 5: Confirm Success

```bash
git status
```

Tell the user:
- Push succeeded
- Branch is now up to date with remote
- Link to view on GitHub (if applicable): `https://github.com/<org>/<repo>/commits/<branch>`

---

## Safety Rules

- NEVER use `--force` or `-f` unless explicitly requested
- NEVER use `--force` on main/master — warn and refuse
- If push is rejected (non-fast-forward), explain the situation and ask how to proceed
- For new branches, always use `-u` to set upstream tracking

---

## Common Scenarios

### New Branch (no upstream)
```bash
git push -u origin <branch-name>
```

### Force Push (only if explicitly requested)
```bash
git push --force-with-lease  # Safer than --force
```
Warn: "Force pushing rewrites history. Only do this if you know what you're doing."

### Push Rejected
Explain: "Push was rejected. The remote has commits you don't have locally."
Options:
1. `git pull --rebase` then push again
2. `git pull` (merge) then push again
3. Force push (destructive, requires explicit confirmation)
