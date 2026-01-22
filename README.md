# LoopFlow

> Structured AI-assisted development workflows that actually work.

LoopFlow is an MCP server that helps you collaborate effectively with AI coding assistants while **becoming a better engineer** — not just shipping faster.

---

## What It Is

LoopFlow solves **context rot** — when AI assistants lose track of what they're doing, or knowledge gets lost between sessions.

The core idea: **one task, one session, one handoff** — with the human firmly in control.

- **Session structure** — Clear start/end boundaries for focused work
- **Task management** — Backlog tracking that persists across sessions  
- **Insight capture** — Knowledge that compounds instead of getting lost
- **Context economy** — Only load what you need, keep sessions fast

---

## Quick Start (5 minutes)

### 1. Install

```bash
npm install -g loopflow
```

### 2. Initialize in your project

```bash
cd your-project
loopflow init
```

This launches the **setup wizard** which:
1. Creates `.loop-flow/` with SQLite database and `WORKFLOW.md`
2. Detects installed AI tools (Claude Code, OpenCode, Cursor)
3. Configures MCP server registration for selected tools

```
◆  LoopFlow Setup v1.0.0
│
◇  Select AI tools to configure:
│  ◼ Claude Code (detected)
│  ◼ OpenCode (detected)
│  ◻ Cursor
│
◇  Configuring Claude Code...
│  ✔ Added to ~/.claude.json
│
└  Setup complete!
```

To skip the wizard: `loopflow init --no-mcp`

To reconfigure tools later: `loopflow setup`

### 4. Start a session

Tell your AI assistant:
> "loopstart"

The agent calls `loop_orient` and gets full context: workflow rules, tasks, insights, and suggested actions from previous sessions.

---

## MCP Tools Reference

| Tool | Purpose |
|------|---------|
| `loop_orient` | Start session, get full context |
| `loop_remember` | Capture an insight quickly |
| `loop_scan` | Search insights and tasks |
| `loop_expand` | Get full details for specific IDs |
| `loop_connect` | Find related insights |
| `loop_probe` | Ask structured questions |
| `loop_handoff` | End session gracefully |
| `loop_task_create` | Create a new task |
| `loop_task_update` | Update task status/priority |
| `loop_task_list` | List tasks with filters |
| `loop_insight_update` | Update insight tags/links |
| `loop_update_summary` | Update repo context |
| `loop_export` | Export to JSON files |
| `loop_import` | Import from JSON files |

---

## Workflow

```
Session Start (loop_orient)
    |
    v
Pick a task (loop_task_update -> IN_PROGRESS)
    |
    v
Work (capture insights with loop_remember)
    |
    v
Complete task (loop_task_update -> DONE)
    |
    v
Session End (loop_handoff)
```

Each session is focused on **one task**. Insights and progress persist in SQLite. The next session picks up where you left off.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/DESIGN.md](./docs/DESIGN.md) | Technical architecture and MCP API design |
| [docs/UX-REQUIREMENTS.md](./docs/UX-REQUIREMENTS.md) | UX decisions and conversation modes |
| [.loop-flow/WORKFLOW.md](./.loop-flow/WORKFLOW.md) | Full methodology rules (after init) |

---

## Roadmap

- [x] MCP server with cognitive tools
- [x] SQLite-backed task and insight management
- [x] Session lifecycle (orient/handoff)
- [x] CLI with `loopflow init` and `loopflow ui`
- [x] Local dashboard UI (React + Vite + Tailwind)
- [ ] Multi-repo insights (global ~/.loopflow/)
- [ ] Team sync protocol

---

## Philosophy

**AI should amplify thinking, not replace it.** You make the decisions. AI helps explore options faster, but the understanding must live in your head.

**The goal is growth, not just output.** Shipping code is good. Becoming a better engineer is better.

**Knowledge should compound.** Write things down. Reflect. Build expertise over time.

---

## License

MIT
