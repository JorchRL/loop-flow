# LoopFlow Roadmap

**Created**: 2026-01-22 (Session 24)
**Last Updated**: 2026-01-22

---

## Current State (v1.0.0 - First Shareable Release)

- [x] SQLite source of truth with FTS5 search
- [x] MCP tools: orient, remember, scan, expand, connect, probe, handoff, export, import, update_summary
- [x] CRUD tools: task_create, task_update, task_list, insight_update
- [x] Session persistence and handoff
- [x] Progressive disclosure pattern
- [x] Works in Claude Code, Cursor, OpenCode
- [x] `loopflow init` CLI command
- [x] Web UI dashboard (`loopflow ui`, `loop_ui` MCP tool)
- [x] README.md with quickstart
- [x] Cursor MCP configuration docs
- [x] MCP server integration tests

---

## Milestone: v1.0 — "Shareable MVP" ✅ COMPLETE

**Goal**: Jr devs on Cursor can use LoopFlow  
**Completed**: 2026-01-22 (Sessions 24-26)

| ID | Task | Priority | Status |
|----|------|----------|--------|
| LF-082 | `loopflow init` CLI command | HIGH | DONE |
| LF-104 | CRUD MCP tools (task/insight management) | HIGH | DONE |
| LF-083 | Cursor MCP configuration docs | HIGH | DONE |
| LF-084 | README.md (quickstart, what/why/how) | HIGH | DONE |
| LF-085 | Fresh repo handling (no existing .loop-flow/) | HIGH | DONE |
| LF-086 | Error messages for common issues | MEDIUM | DONE |
| LF-081 | MCP server integration tests | MEDIUM | DONE |
| LF-079 | Fix loop_handoff suggested_actions | HIGH | DONE |
| LF-080 | loop_handoff creates session record | HIGH | DONE |
| LF-108 | Web UI dashboard | MEDIUM | DONE |

**v1.0 Definition of Done:** ✅
- [x] `npm install -g loopflow && loopflow init` works
- [x] Works in Claude Code, OpenCode, Cursor
- [x] README exists with 5-min quickstart
- [x] Fresh repo gets bootstrapped correctly
- [x] Jr dev can follow README and be productive

---

## Milestone: v1.1 — "External DB & Multi-Repo"

**Goal**: DB lives outside repo, cross-repo insights  
**Priority**: HIGH (enables multi-repo vision)  
**Effort**: ~4-5 sessions

| ID | Task | Priority | Status |
|----|------|----------|--------|
| LF-087 | [DESIGN] External DB architecture | HIGH | TODO |
| LF-088 | `~/.loopflow/` folder structure | HIGH | TODO |
| LF-089 | `config.yaml` schema and loading | HIGH | TODO |
| LF-090 | Repo registration (`loopflow register`) | HIGH | TODO |
| LF-091 | Auto-detect repo from cwd | MEDIUM | TODO |
| LF-092 | Cross-repo search (`loop_scan scope:all`) | HIGH | TODO |
| LF-093 | Migration path: in-repo → external DB | MEDIUM | TODO |

**v1.1 Definition of Done:**
- [ ] DB stored in `~/.loopflow/repos/<name>.db`
- [ ] Config file defines registered repos
- [ ] `loop_scan` can search across all repos
- [ ] Existing in-repo setups migrate cleanly

---

## Milestone: v1.2 — "Polish & Robustness"

**Goal**: Production-quality local experience  
**Priority**: MEDIUM  
**Effort**: ~3 sessions

| ID | Task | Priority | Status |
|----|------|----------|--------|
| LF-094 | Backup/restore commands | MEDIUM | TODO |
| LF-095 | `loopflow status` command | LOW | TODO |
| LF-096 | Schema migrations for upgrades | MEDIUM | TODO |
| LF-097 | Insight deduplication | LOW | TODO |
| LF-054 | Vector search (ChromaDB) | LOW | TODO |
| LF-055 | Privacy controls (`<private>` tags) | LOW | TODO |

---

## Milestone: v2.0 — "Team Sync & Cloud"

**Goal**: Teams share insights, optional SaaS  
**Priority**: LOW (future)  
**Effort**: ~8-10 sessions

| ID | Task | Priority | Status |
|----|------|----------|--------|
| LF-098 | [DESIGN] Team sync protocol | HIGH | TODO |
| LF-099 | Insight visibility model (private/team/public) | HIGH | TODO |
| LF-100 | REST API for web dashboard | MEDIUM | TODO |
| LF-101 | Postgres schema (multi-tenant) | MEDIUM | TODO |
| LF-102 | Sync service (local ↔ cloud) | HIGH | TODO |
| LF-103 | Web dashboard UI | LOW | TODO |

**v2.0 Definition of Done:**
- [ ] Teams can share insights with `visibility: team`
- [ ] REST API enables web dashboard
- [ ] Optional cloud sync (local remains source of truth)
- [ ] Conflict resolution works

---

## Architecture Evolution

```
Current (v1.0.0):
  repo/.loop-flow/loopflow.db  ← One DB per repo, inside repo

v1.1 (External DB):
  ~/.loopflow/
    ├── config.yaml           ← Global config
    ├── repos/
    │   ├── repo1.db          ← Per-repo knowledge
    │   ├── repo2.db
    │   └── repo3.db
    └── global.db             ← Cross-repo insights (optional)

v2.0 (Team/Cloud):
  ~/.loopflow/
    ├── config.yaml           ← Points to remote
    └── cache.db              ← Local cache for offline
  
  cloud.loopflow.io/
    └── postgres              ← Team shared knowledge
```

---

## Version History

- **v1.0.0** (2026-01-22): First shareable release - npm package, CLI, Web UI, full MCP tools
- **v0.9.0** (2026-01-22): MCP tools replace skills
- **v0.8.0** (2026-01-20): Emergency bail command
- **v0.7.0** (2026-01-20): Skills system (now obsolete)
- **v0.6.0** (2026-01-20): Distributed Discovery & MINILOOP
- **v0.5.0** (2026-01-20): Spec-driven development
- **v0.4.0** (2026-01-18): Renamed AGENTS.md to WORKFLOW.md
- **v0.3.0** (2026-01-18): Unified setup file
- **v0.2.0** (2026-01-18): Learn mode
- **v0.1.0** (2026-01-17): Initial release

---

## Future Ideas (Unscheduled)

- **Artifacts table**: Store roadmaps, design docs, etc. in DB alongside insights/tasks
- **Insight abstraction**: Synthesize many concrete insights into fewer abstract principles
- **llm.txt integration**: Auto-discover domain knowledge hooks
- **DSPy integration**: Programmatic prompt engineering for personas
- **Distributed discovery**: AI interviewers for team knowledge extraction

---

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
