# PR Review Workflow

A repeatable workflow for reviewing PRs from team members and merging to main.

## When to Use

- Team member submits a PR for review
- You want AI-assisted code review before merging
- Feature branch needs final QA before production

## Workflow Steps

### 1. CONTEXT GATHERING (Parallel)

Run these commands simultaneously to understand the PR:

```bash
# Current branch and recent commits
git branch --show-current && git log --oneline -10

# Commits in this PR (from main)
git log main..HEAD --oneline

# Files changed with line counts
git diff main..HEAD --stat
```

Also read:
- `.loop-flow/plan/progress.txt` - for session history related to this work
- Any relevant `ARCHITECTURE.md` files for packages being modified

### 2. CODE REVIEW

Read the key files changed. Prioritize:
1. **Entry points** - API routes, exported functions
2. **Core logic** - Services, business logic
3. **Data layer** - Schema changes, database adapters
4. **Configuration** - Environment variables, constants

For each major component, assess:
- Does the architecture make sense?
- Are there obvious bugs or edge cases?
- Is error handling adequate?
- Are there security concerns?

### 3. RUN TESTS

```bash
# Package-specific tests if they exist
cd packages/<package> && npm test

# Or run test file directly
npx tsx path/to/tests/file.test.ts

# Type check the package
npx tsc --noEmit
```

### 4. PRODUCTION RISK ASSESSMENT

Categorize findings by deployment risk:

| Severity | Criteria | Action |
|----------|----------|--------|
| **CRITICAL** | Will break production, data loss, security hole | Must fix before merge |
| **MEDIUM** | Suboptimal but functional, edge case bugs | Document, fix later OK |
| **LOW** | Code style, minor improvements, nice-to-haves | Note for future |

Focus review output on: **"What could break in production?"**

### 5. FIX CRITICAL ISSUES

If critical issues found:
1. Make the fix
2. Commit with clear message explaining the bug
3. Push to the feature branch

```bash
git add <files>
git commit -m "fix(<scope>): <description>

<Explanation of what was broken and why>"
git push origin <branch>
```

### 6. MERGE TO MAIN

If PR exists, merge via GitHub CLI:

```bash
# Check for existing PR
gh pr list --head <branch-name>

# Squash merge with descriptive message
gh pr merge <pr-number> --squash \
  --subject "feat(<scope>): <title>" \
  --body "## Summary
- Key change 1
- Key change 2

## Bug Fixes
- Fixed X that would have caused Y"
```

### 7. TRIGGER DEPLOY (Optional)

If immediate deploy needed:

```bash
git checkout main && git pull origin main
git commit --allow-empty -m "chore: trigger deploy"
git push origin main
```

## Review Checklist

### Before Approving

- [ ] No critical bugs that would break production
- [ ] Required environment variables documented
- [ ] Database migrations are safe (no data loss)
- [ ] Error handling won't silently fail
- [ ] Tests pass (or test coverage is acceptable)

### Environment Variables to Verify

For any new feature, check:
- Are all required env vars documented?
- Are they set in Vercel/production?
- Do they have sensible defaults for development?

## Example Session

```
User: "Review this PR branch"

AI:
1. Gathers context (git status, diff, progress.txt)
2. Reads key files (entry points, core logic, schema)
3. Runs tests
4. Identifies: 1 critical bug, 2 medium issues, 3 low
5. Reports findings with risk assessment
6. User says "fix critical and merge"
7. AI fixes bug, commits, pushes, merges PR
8. Optionally triggers deploy with empty commit
```

## Key Insight

The value of AI-assisted PR review is **risk identification**, not style nitpicking. Focus on:
- What could break in production?
- What's missing that will cause problems later?
- What assumptions might be wrong?

Leave code style and minor improvements for later iterations.
