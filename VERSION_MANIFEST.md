# LoopFlow Version Manifest

> Single source of truth for LoopFlow versioning.

**Current Version:** 0.8.0  
**Last Updated:** 2026-01-20

---

## How to Use This File

When bumping the version, the agent should:

1. **Update this manifest** — Bump version number, add changelog entry
2. **Propagate to referenced files** — Update all locations listed below
3. **Regenerate LOOP-FLOW-SETUP.md** — If templates changed (verify WORKFLOW.md template matches `.loop-flow/WORKFLOW.md`)
4. **Verify consistency** — Run grep to ensure no stale version references

Human triggers version bumps at meaningful milestones (not every commit).

---

## Version References

Files that contain version numbers to update:

| File | Location(s) |
|------|-------------|
| `LOOP-FLOW-SETUP.md` | Line ~5 (header), template header (~229), insights.json template (~208) |
| `docs/DESIGN.md` | Footer (~641) |
| `docs/UX-REQUIREMENTS.md` | Footer (~194) |
| `docs/SKILLS-DESIGN.md` | Header (~3) |
| `.loop-flow/WORKFLOW.md` | Header (~3) |

### Verification Command

```bash
grep -rn "0\.[0-9]\.[0-9]" *.md docs/*.md .loop-flow/*.md 2>/dev/null | grep -iE "version"
```

All should show the current version (except `schema_version` which is separate).

---

## Changelog

### 0.8.0 (2026-01-20)

**Separate Emergency Bail Command**

- Added `/loop-bail` skill: Emergency exit that only creates RESUME.md (fast, no questions)
- Separated emergency handling from `/loop-end` for clarity
- `/loop-end` is now purely for graceful handoffs
- `/loop-start` now checks for RESUME.md and offers to resume from a bail
- Three commands: `/loop-start` (begin), `/loop-end` (graceful), `/loop-bail` (emergency)

---

### 0.7.0 (2026-01-20)

**Skills System (loop-start, loop-end)**

- Added `/loop-start` skill: Reliably reads .loop-flow/ state and proposes tasks
- Added `/loop-end` skill: Graceful handoff OR context emergency with RESUME.md
- Skills follow Agent Skills standard (works in Claude Code + OpenCode)
- Skill templates included in LOOP-FLOW-SETUP.md
- Skills live in `.claude/skills/` or `.opencode/skills/` (user's choice)

---

### 0.6.0 (2026-01-20)

**Distributed Discovery & MINILOOP**

- Added Distributed Discovery pattern: using AI agents as parallel interviewers to extract tacit knowledge from teams
- Introduced MINILOOP.md concept: a lightweight, single-file Loop-Flow installation for feature branches
- MINILOOP enables "probing" team members asynchronously — results committed and synthesized by lead
- Added PR Review Workflow: risk-focused code review pattern (critical/medium/low categorization)
- New docs: `docs/DISTRIBUTED-DISCOVERY.md`, `docs/PR-REVIEW-WORKFLOW.md`

---

### 0.5.0 (2026-01-20)

**Spec-Driven Development & Testing Philosophy**

- Added spec-driven development insights (human writes specs, AI implements)
- Added verification functions pattern for testing constraint satisfaction
- Added skills system concept (encapsulated commands for reliable operations)
- Added Loop-Flow as learning platform vision (ADHD-friendly, writing-to-learn)
- 4 new process insights imported from learn-tdd-go cross-pollination

---

### 0.4.0 (2026-01-18)

**Renamed AGENTS.md to WORKFLOW.md**

- Renamed `.loop-flow/AGENTS.md` → `.loop-flow/WORKFLOW.md`
- Avoids confusion with root `AGENTS.md` (repo-specific rules)
- Root `AGENTS.md` = project rules + "read Loop-Flow"
- `.loop-flow/WORKFLOW.md` = Loop-Flow methodology
- Update path handles renaming from old installations
- Deleted obsolete `SCAFFOLD.md`
- Slimmed `README.md` to lightweight entry point

---

### 0.3.0 (2026-01-18)

**Unified Setup File**

- Merged bootstrap and update into single `LOOP-FLOW-SETUP.md`
- Auto-detects whether to install fresh or update existing
- Version number at top for quick reference
- Full changelog in VERSION HISTORY section
- Process insights tagged with `loop-flow-core` carry methodology forward

---

### 0.2.0 (2026-01-18)

**Learn Mode & Refined Conversation Modes**

- Added Learn mode for acquiring external knowledge
- `[LEARN]` task type for domain knowledge acquisition
- Refined modes vs tasks distinction
- All five conversation modes documented: Work, Discovery, Discuss, Learn, Review
- Proactive insight capture protocol

---

### 0.1.0 (2026-01-17)

**Initial Release**

- Core workflow: one task, one session, one handoff
- File-based state: backlog.json, progress.txt, insights.json
- Four conversation modes: Work, Discovery, Discuss, Review
- Task types: `[IMPL]`, `[DESIGN]`, `[SPIKE]`, `[REVIEW]`, `[BUG]`, `[DISCUSS]`, `[DISCOVERY]`
- Insight capture with leverage hierarchy
- Theory preservation philosophy (Naur)

---

## Template Sync Note

The WORKFLOW.md template inside `LOOP-FLOW-SETUP.md` should match `.loop-flow/WORKFLOW.md` (this repo dogfoods itself). When updating the workflow methodology:

1. Edit `.loop-flow/WORKFLOW.md` (the live version)
2. Copy changes to the template in `LOOP-FLOW-SETUP.md`
3. Bump version in both places

Future: Automate this with template generation.
