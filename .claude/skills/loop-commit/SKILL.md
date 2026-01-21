---
name: loop-commit
description: Create a git commit with a well-formed message. Analyzes staged and unstaged changes, drafts message, and commits.
framework: loop-flow
disable-model-invocation: true
---

# Create Git Commit

You are creating a git commit. Follow these steps:

## Step 1: Analyze Changes

Run these commands in parallel to understand the current state:

```bash
git status
git diff --stat
git diff --cached --stat
git log -3 --oneline
```

Identify:
- What files are staged vs unstaged
- The nature of the changes (new feature, bug fix, refactor, docs, etc.)
- Recent commit message style for consistency

## Step 2: Stage Changes (if needed)

If there are unstaged changes the user likely wants to commit:
- Ask: "Stage all changes, or select specific files?"
- Default to staging all if user says "yes" or "commit everything"

```bash
git add .
```

Or stage specific files as requested.

## Step 3: Draft Commit Message

Follow conventional commits format:

```
<type>: <short summary>

<optional body with details>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Guidelines:**
- Summary line: imperative mood, lowercase, no period, max 50 chars
- Body: wrap at 72 chars, explain "why" not "what"
- Reference task IDs if applicable (e.g., "Implements LF-001")

## Step 4: Commit

```bash
git commit -m "<message>"
```

Or for multi-line messages:
```bash
git commit -m "<summary>" -m "<body>"
```

## Step 5: Confirm

Show the result:
```bash
git log -1 --oneline
git status
```

Tell the user:
- Commit hash and message
- Whether there are unpushed commits
- Remind: `git push` or `/loop-push` to publish

---

## Safety Rules

- NEVER use `--amend` unless explicitly requested AND the commit hasn't been pushed
- NEVER use `--no-verify` unless explicitly requested
- NEVER commit files that look like secrets (.env, credentials, tokens)
- If pre-commit hooks fail, fix the issues and create a NEW commit
