# Skills System Design

**Version:** 0.8.0  
**Status:** Design Complete  
**Task:** LF-022

---

## Overview

Skills are reusable agent capabilities that encode specific knowledge about how to perform a task. They extend what AI coding assistants can do by providing structured instructions, templates, and domain knowledge.

LoopFlow uses skills for reliable session management and workflow automation. This document defines the architecture for LoopFlow's skills system.

---

## Skill Types

### 1. Framework Skills

Skills that ship with a methodology or tool (like LoopFlow). They provide core workflow functionality.

**Characteristics:**
- Marked with `framework: <name>` in frontmatter
- Distributed via templates (LOOP-FLOW-SETUP.md)
- Updated when the framework version bumps
- Should not be modified by users (fork instead)

**LoopFlow Framework Skills:**
| Skill | Purpose | Invocation |
|-------|---------|------------|
| `loop-start` | Begin a session, read state, propose tasks | User-only |
| `loop-end` | Save state, graceful or emergency handoff | User-only |
| `loop-commit` | Create git commit with well-formed message | User-only |
| `loop-push` | Push commits to remote safely | User-only |
| `loop-update` | Fetch latest LoopFlow from GitHub and update | User-only |
| `capture-insight` | Quick-capture an insight (future) | Agent-invocable |
| `update-backlog` | Add/update tasks (future) | Agent-invocable |

### 2. User-Defined Skills

Project-specific skills created by developers for their repos.

**Characteristics:**
- No `framework` field in frontmatter
- Live in `.claude/skills/` or `.opencode/skills/`
- Specific to one project's needs
- Examples: `/deploy`, `/release-notes`, `/run-e2e`

---

## Skill Structure

Each skill is a directory containing `SKILL.md` and optional supporting files.

```
<skill-name>/
  SKILL.md           # Required: instructions + frontmatter
  template.md        # Optional: templates for Claude to fill
  examples/          # Optional: example outputs
  scripts/           # Optional: helper scripts
```

### SKILL.md Format

```markdown
---
name: skill-name
description: What this skill does and when to use it
framework: loop-flow              # Optional: marks framework skill
disable-model-invocation: true    # Optional: user-only (default: false)
user-invocable: true              # Optional: show in / menu (default: true)
allowed-tools: Read, Grep, Glob   # Optional: restrict available tools
context: fork                     # Optional: run in subagent
agent: Explore                    # Optional: subagent type
---

# Skill Title

Instructions for the agent...
```

### Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Display name. If omitted, uses directory name. Lowercase, hyphens, max 64 chars. |
| `description` | Recommended | What the skill does. Used by agent to decide when to load. |
| `framework` | No | Marks skill as belonging to a framework (e.g., `loop-flow`). |
| `disable-model-invocation` | No | If `true`, only user can invoke via `/name`. Default: `false`. |
| `user-invocable` | No | If `false`, hidden from `/` menu. Default: `true`. |
| `allowed-tools` | No | Restrict which tools agent can use while skill is active. |
| `context` | No | Set to `fork` to run in isolated subagent context. |
| `agent` | No | Subagent type when `context: fork` (e.g., `Explore`, `Plan`). |

### String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed after `/skill-name` |
| `$1`, `$2`, ... | Positional arguments |
| `${CLAUDE_SESSION_ID}` | Current session ID (Claude Code only) |

---

## File Locations

### Claude Code

```
~/.claude/skills/<name>/SKILL.md      # Personal (all projects)
.claude/skills/<name>/SKILL.md        # Project-specific
```

In Claude Code, skills double as slash commands. `/skill-name` works directly.

### OpenCode

```
~/.config/opencode/skills/<name>/SKILL.md   # Personal
.opencode/skills/<name>/SKILL.md            # Project-specific
.claude/skills/<name>/SKILL.md              # Claude-compatible (also read)

.opencode/commands/<name>.md                # For user slash commands
```

In OpenCode, skills are agent-only (via `skill()` tool). User slash commands need separate files in `.opencode/commands/`.

### LoopFlow Convention

For maximum compatibility, LoopFlow skills are installed in three locations:

```
.claude/skills/loop-start/SKILL.md      # Claude Code skill + command
.opencode/skills/loop-start/SKILL.md    # OpenCode agent skill
.opencode/commands/loop-start.md        # OpenCode user command
```

This duplication ensures `/loop-start` works in both tools.

---

## Invocation Patterns

### User Invocation

User types `/skill-name` in the chat:

| Tool | Location | Works? |
|------|----------|--------|
| Claude Code | `.claude/skills/` | Yes |
| OpenCode | `.opencode/commands/` | Yes |
| OpenCode | `.opencode/skills/` | No (agent-only) |

### Agent Invocation

Agent calls `Skill(name)` or `skill({ name })`:

| Tool | Works? |
|------|--------|
| Claude Code | Yes (unless `disable-model-invocation: true`) |
| OpenCode | Yes (unless permission denied) |

### Invocation Control Matrix

| Frontmatter | User can invoke | Agent can invoke | When to use |
|-------------|-----------------|------------------|-------------|
| (default) | Yes | Yes | General-purpose skills |
| `disable-model-invocation: true` | Yes | No | Explicit actions (deploy, commit) |
| `user-invocable: false` | No | Yes | Background knowledge |

---

## Distribution

LoopFlow skills are distributed as templates in `LOOP-FLOW-SETUP.md`. When a user runs setup:

1. Agent reads LOOP-FLOW-SETUP.md
2. Agent creates skill directories in all three locations
3. Skills are ready to use

### Template Format in SETUP.md

```markdown
### Skill: loop-start

**Claude Code:** `.claude/skills/loop-start/SKILL.md`
**OpenCode Skill:** `.opencode/skills/loop-start/SKILL.md`  
**OpenCode Command:** `.opencode/commands/loop-start.md`

<skill-content>
---
name: loop-start
description: Start a LoopFlow session
framework: loop-flow
disable-model-invocation: true
---

# Start LoopFlow Session
...
</skill-content>
```

---

## Future Skills

Planned LoopFlow framework skills:

| Skill | Purpose | Invocation |
|-------|---------|------------|
| `capture-insight` | Quick-capture insight without derailing work | Agent-invocable |
| `update-backlog` | Add or update backlog tasks | Agent-invocable |
| `version-bump` | Bump LoopFlow version across files | User-only |
| `review-insights` | Browse and link unprocessed insights | User-only |

---

## Design Decisions

### D1: Accept Duplication for Compatibility

**Decision:** Maintain three copies of each skill (Claude Code, OpenCode skill, OpenCode command).

**Rationale:** Broad compatibility outweighs storage cost. Skills are small text files. The alternative (single source + symlinks) is fragile and platform-dependent.

### D2: Framework Marker in Metadata

**Decision:** Use `framework: loop-flow` frontmatter to mark framework skills.

**Rationale:** Keeps skills in standard locations (`.claude/skills/`, `.opencode/skills/`) while clearly indicating origin. Enables future tooling to differentiate framework vs user skills.

### D3: Hybrid Invocation Control

**Decision:** Session boundary skills (start/end) are user-only. Future operational skills (capture-insight, update-backlog) are agent-invocable.

**Rationale:** Session start/end should be explicit user decisions. But within a session, the agent should be able to capture insights or update the backlog proactively.

### D4: SAVE-FIRST Pattern for loop-end

**Decision:** loop-end skill writes state files BEFORE any summary or confirmation.

**Rationale:** loop-end may be an emergency handoff (context limit approaching). State must be saved even if the conversation ends abruptly. See INS-043.

---

## Cross-Tool Compatibility Notes

### Claude Code Extensions

Claude Code extends the Agent Skills standard with:
- `disable-model-invocation` — prevent agent from loading skill
- `context: fork` — run in subagent
- `agent` — specify subagent type
- `allowed-tools` — restrict tool access
- Dynamic context injection via `!`command``

### OpenCode Extensions

OpenCode has:
- Separate `commands/` directory for user slash commands
- Permission system (`allow`, `deny`, `ask`) for skill access
- `license`, `compatibility`, `metadata` frontmatter fields

### Compatibility Strategy

LoopFlow skills use the common subset plus clearly documented extensions:
- Core: `name`, `description`
- LoopFlow: `framework`
- Claude Code: `disable-model-invocation`
- OpenCode commands: separate files with `description` frontmatter

---

## Related Insights

- **INS-029**: Skills concept — Core Skills vs User-Defined Skills
- **INS-030**: Versioning skill — VERSION_MANIFEST as source of truth
- **INS-032**: Reliable commands — `/loop-start` should "just work"
- **INS-041**: Skills provide reliable session commands
- **INS-042**: Claude Code vs OpenCode skill/command differences
- **INS-043**: End-loop must save state FIRST (emergency handoff)

---

## References

- [Claude Code Skills Documentation](https://docs.anthropic.com/en/docs/claude-code/skills)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills/)
- [OpenCode Commands](https://opencode.ai/docs/commands/)
- [Agent Skills Standard](https://agentskills.io)
