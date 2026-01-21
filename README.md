# LoopFlow

> Structured AI-assisted development workflows that actually work.

LoopFlow helps you collaborate effectively with AI coding assistants while **becoming a better engineer** — not just shipping faster.

---

## What It Is

LoopFlow solves **context rot** — when AI assistants lose track of what they're doing, or knowledge gets lost between sessions.

The core idea: **one task, one session, one handoff** — with the human firmly in control.

- **Session structure** — Clear start/end boundaries for focused work
- **Task management** — Backlog tracking that persists across sessions  
- **Learning capture** — Knowledge that compounds instead of getting lost
- **Context economy** — Only load what you need, keep sessions fast

---

## Getting Started

### Quick Bootstrap (One-liner)

Run this in your project directory, then tell your AI agent to set up LoopFlow:

```bash
curl -sO https://raw.githubusercontent.com/JorchRL/loop-flow/main/LOOP-FLOW-SETUP.md
```

Then tell your agent:
> "Set up LoopFlow using LOOP-FLOW-SETUP.md"

The agent handles everything — creating files, installing skills, explaining the workflow, and cleaning up.

### Manual Setup

Alternatively, copy [LOOP-FLOW-SETUP.md](./LOOP-FLOW-SETUP.md) to your project manually.

### Updating

Once installed, run `/loop-update` to fetch the latest version from GitHub.

### MCP Server (Coming Soon)

```bash
npx loop-flow init
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [LOOP-FLOW-SETUP.md](./LOOP-FLOW-SETUP.md) | Setup/update file (copy to your project) |
| [docs/DESIGN.md](./docs/DESIGN.md) | Technical architecture and MCP API design |
| [docs/UX-REQUIREMENTS.md](./docs/UX-REQUIREMENTS.md) | UX decisions and conversation modes |
| [docs/DISTRIBUTED-DISCOVERY.md](./docs/DISTRIBUTED-DISCOVERY.md) | Team knowledge extraction via AI interviewers |

---

## Roadmap

- [x] File-based workflow
- [x] Distributed discovery pattern (AGENTS.md as interviewer)
- [ ] MCP server with `loop.start` / `loop.end`
- [ ] Task and learning management tools
- [ ] Multi-repo support
- [ ] Local dashboard UI
- [ ] Team sync
- [ ] Automated discovery synthesis

---

## Philosophy

**AI should amplify thinking, not replace it.** You make the decisions. AI helps explore options faster, but the understanding must live in your head.

**The goal is growth, not just output.** Shipping code is good. Becoming a better engineer is better.

**Knowledge should compound.** Write things down. Reflect. Build expertise over time.

**Thinking is a fundamental human capacity.** Don't outsource it. Use AI as a tool, not a crutch.

---

## License

MIT
