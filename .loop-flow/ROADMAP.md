# LoopFlow Roadmap

**Created**: 2026-01-22 (Session 24)
**Last Updated**: 2026-01-22

---

## Current State (v0.9.0 → v1.0 in progress)

- [x] SQLite source of truth with FTS5 search
- [x] MCP tools: orient, remember, scan, expand, connect, probe, handoff, export, import, update_summary
- [x] CRUD tools: task_create, task_update, task_list, insight_update (v0.7.0)
- [x] Session persistence and handoff
- [x] Progressive disclosure pattern
- [x] Works in Claude Code
- [x] `loopflow init` CLI command (LF-082, S24)

---

## Milestone: v1.0 — "Shareable MVP"

**Goal**: Jr devs on Cursor can use LoopFlow  
**Priority**: HIGH (blocks team adoption)  
**Effort**: ~3-4 sessions

| ID | Task | Priority | Status |
|----|------|----------|--------|
| LF-082 | `loopflow init` CLI command | HIGH | DONE (S24) |
| LF-104 | CRUD MCP tools (task/insight management) | HIGH | DONE (S24) |
| LF-083 | Cursor MCP configuration docs | HIGH | TODO |
| LF-084 | README.md (quickstart, what/why/how) | HIGH | TODO |
| LF-085 | Fresh repo handling (no existing .loop-flow/) | HIGH | TODO |
| LF-086 | Error messages for common issues | MEDIUM | TODO |
| LF-081 | MCP server integration tests | MEDIUM | TODO |
| LF-079 | Fix loop_handoff suggested_actions | HIGH | DONE (S23) |
| LF-080 | loop_handoff creates session record | HIGH | DONE (S22) |

**v1.0 Definition of Done:**
- [ ] `npm install -g loopflow && loopflow init` works
- [ ] Works in Claude Code, OpenCode, Cursor
- [ ] README exists with 5-min quickstart
- [ ] Fresh repo gets bootstrapped correctly
- [ ] Jr dev can follow README and be productive

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
Current (v0.9 - v1.0):
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

## Backlog Cleanup Notes

**Tasks to mark DONE** (already completed):
- LF-059, LF-060, LF-061, LF-063, LF-067, LF-068 — Done in S19
- LF-079, LF-080 — Done in S22/S23

**Tasks to mark OBSOLETE/CANCELLED**:
- LF-002, LF-003, LF-005, LF-006 — Superseded (project already set up)
- LF-007, LF-008 — Old tool names, superseded by current tools
- LF-016, LF-025-029, LF-030-046 — Skill-related or outdated learn tasks
- LF-065, LF-066 — Merged into completed work
- LF-070-073 — Business rules merged into impl

**Tasks to defer** (v2.0+):
- LF-076, LF-077 — Persona architecture
- LF-048, LF-051, LF-056, LF-057 — Discovery tasks

---

## Future Ideas (Unscheduled)

- **Artifacts table**: Store roadmaps, design docs, etc. in DB alongside insights/tasks
- **Insight abstraction**: Synthesize many concrete insights into fewer abstract principles
- **llm.txt integration**: Auto-discover domain knowledge hooks
- **DSPy integration**: Programmatic prompt engineering for personas
- **Distributed discovery**: AI interviewers for team knowledge extraction

---

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
