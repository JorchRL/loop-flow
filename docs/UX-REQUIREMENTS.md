# Loop-Flow UX Requirements

> Discovered via interview session, 2026-01-17

---

## Design Principles

1. **Agent as external memory** — You walk in cold; the agent remembers everything
2. **Concise first, detail on request** — Summaries, not walls of text
3. **Trust by default, friction on request** — Autosave, but let user override
4. **Fluid modes** — Conversation style adapts naturally, no rigid state machines
5. **MCP returns data, consumers own presentation** — Same data serves terminal agent and web UI

---

## Session Start (Cold Start)

**User has context rot. Agent has full state.**

- User can ask anything: "What was I doing?", "What's the state of X?", "What's next?"
- Agent responds concisely, offers interactive choices for next steps
- Recommended format:

```
Agent: Last session you finished LF-001.5 (domain model).

[interactive picker]
┌─ What next? ─────────────────────────────────┐
│ ● Start LF-001 (MCP Research) (Recommended)  │
│ ○ Remind me about recent progress            │
│ ○ Show me open tasks                         │
│ ○ Search insights                            │
└──────────────────────────────────────────────┘
```

---

## Session End (Wrap-up)

**Trust by default. Autosave before summary.**

Trigger: Either user says "wrap up" OR agent notices natural stopping point and proposes.

Flow:
1. Agent autosaves immediately (task status, insights, progress)
2. Then shows brief summary:

```
Agent: ✓ Wrapped up LF-001.5 (complete).

       Insights saved:
       • Learnings have a leverage hierarchy
       • Links between insights are insights themselves
       
       See you next loop!
```

- Task status: agent infers from conversation (done/blocked/partial)
- Session notes: agent writes the "previously on..." automatically
- Insights: auto-captured, shown in summary for awareness
- User can tweak anything after seeing summary ("wait, that insight isn't quite right")

---

## Mid-Task Interactions

### Subtasks

Size-based judgment:

| Size | Agent behavior |
|------|----------------|
| Small (< 10 min) | Just do it, maybe mention "btw handling X" |
| Medium (could be own task) | Quick check: "Tackle now or add to backlog?" |
| Large (scope creep) | Flag and defer: "Adding to backlog, let's stay focused" |

### Quick Insight Capture

Multiple entry points, same outcome:

1. **Prefix trigger**: "Note: ..." or "Insight: ..." → agent snapshots, no confirmation
2. **Agent notices**: detects insightful statement → asks "Worth capturing?" (moderate sensitivity)
3. **Explicit command**: "Capture insight: ..." → formal, agent snapshots

Response: `✓ Captured (unprocessed). Back to work.`

Auto-creates `[DISCUSS]` task for later synthesis.

### Blockers

Different blockers, different responses:

| Blocker type | Agent response |
|--------------|----------------|
| Technical (how do I do X?) | Rubber duck, research together, suggest approaches |
| Decision (A or B?) | Socratic: what are the tradeoffs? |
| External (waiting on access) | Record blocker, suggest alternative work |
| Knowledge gap (I don't understand X) | Teach, explain, point to resources |

Recording: Agent decides if resolution is interesting enough to capture as insight.

### Context Lookup

Two modes:

1. **Natural question**: "Why did we choose SQLite?"
   - Agent searches and gives synthesized answer
   - Citations on request only (keeps it conversational)

2. **Explicit search**: "Search: authentication"
   - Returns list of matches to browse

Scope: Current project by default. Say "search all projects" to expand.

---

## Conversation Modes

Modes are descriptive, not prescriptive. Agent reads the vibe and adapts.

| Mode | What it is | Style | Output |
|------|-----------|-------|--------|
| **Work** | Implementing, coding, fixing | Focused, efficient | Code, tests, docs |
| **Discovery** | Extract requirements | Rapid Q&A, choices | Decisions, preferences |
| **Discuss** | Deep Socratic exploration | Slow, thoughtful | Refined insights, links |
| **Review** | Auditing, critiquing | Evaluative | Feedback, suggestions |

### Mode Transitions

- Fluid blending, no explicit switches
- Agent can name shifts when helpful — EXCEPT in Work mode (preserve context budget)
- Examples:
  - "Wait, why are we doing it this way?" → Discuss
  - "What are the options here?" → Discovery
  - "Ok let's just do it" → Work
  - "Show me what's there" → Review

### Discovery Mode Details

Rapid-fire questions with constrained choices. Agent extracts requirements from user.

- Ends when user says "I think we have enough"
- Agent crystallizes: summarizes decisions discovered
- Output captured based on content:
  - Design decisions → Insights + DESIGN.md
  - UX requirements → Requirements doc or acceptance criteria
  - New task ideas → Backlog
  - Scope clarification → Task description update

---

## Task Types

| Type | Purpose |
|------|---------|
| `[IMPL]` | Implementation work |
| `[DESIGN]` | Design discussion, architecture decisions |
| `[SPIKE]` | Exploratory research to reduce uncertainty |
| `[REVIEW]` | Audit existing code, docs, TODOs |
| `[DISCUSS]` | Synthesize unprocessed insights |
| `[DISCOVERY]` | Requirement-gathering session |

---

## Interactive UI Elements

Use Claude Code's `mcp_question` tool for choices. Prefer pickers over prose when:
- User needs to choose between options
- Confirming/selecting from a list
- Keeping context tight

Format: One line of context, then picker. Not walls of explanation.

---

*Document version: 0.1.0*
*Source: Discovery session LF-001.5b, 2026-01-17*
