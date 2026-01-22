# Fluid API Paradigm

## Specification Document v0.1

**Status**: DRAFT  
**Created**: 2026-01-21  
**Task**: LF-076, LF-077  

---

## Overview

This document describes a paradigm shift in how LoopFlow exposes capabilities to AI agents. Instead of traditional procedural APIs (call functions, get results), LoopFlow provides **semantic APIs** — personas that the main agent can consult, reason about, and creatively combine.

### The Core Insight

**Traditional API**: You define functions → Users call them → Capability = what you coded

**Fluid API**: You define personas → Agent reasons creatively → Capability = agent creativity × persona capabilities

The API surface is *smaller* but the capability space is *larger*.

---

## Theoretical Foundation

### The Digital Clockwork Muse (Saunders & Gero, 2001)

This paradigm is inspired by computational creativity research showing that creativity emerges from **social dynamics between specialized agents**, not from a single general agent.

Key concepts from the paper:

| Concept | In the Paper | In LoopFlow |
|---------|--------------|-------------|
| Novelty-seeking agents | Agents search for interesting artifacts | Personas seek relevant knowledge |
| Interestingness assessment | Agents evaluate artifacts | Personas evaluate relevance/quality |
| Communication of discoveries | Agents share interesting finds | Personas share insights with Codriver |
| Reward system | Agents reward each other | Insights that prove valuable get reinforced |
| Social organization | Emerges from agent interactions | Emerges from persona consultation patterns |

### Theory Preservation (Naur)

LoopFlow is a theory preservation system (INS-002). The Fluid API paradigm extends this recursively: **LoopFlow preserves theory about how to preserve theory**.

The system learns from its own use, capturing patterns of effective persona consultation as process insights that inform future behavior.

---

## The Paradigm Shift

### From Procedural to Semantic

**Before (Procedural)**:
```typescript
// Agent must know the right function to call
const results = await loop_scan({ query: "testing patterns", scope: ["insights"] });
const expanded = await loop_expand({ ids: results.matches.slice(0, 3).map(m => m.id) });
// Agent processes results...
```

**After (Semantic)**:
```
Agent reasoning: "I need to understand our testing patterns. 
The Curator knows about captured insights... let me ask."

→ ask_curator({ 
    question: "What do we know about testing patterns in this project?",
    context: "I'm about to write tests for the new search module"
  })

Curator responds with relevant insights, suggests related topics,
notes gaps in knowledge that might need research.
```

### What Changes

| Aspect | Procedural API | Semantic/Fluid API |
|--------|---------------|-------------------|
| Agent's task | Call correct function with correct params | Reason about who can help |
| Extensibility | Add new functions | Agent finds new combinations |
| Learning curve | Learn function signatures | Understand persona capabilities |
| Capability bound | What's coded | Agent creativity × personas |
| Error mode | Wrong function/params | Wrong persona for task (recoverable) |

---

## The Feedback Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE LOOPFLOW LOOP                             │
└─────────────────────────────────────────────────────────────────┘

  User discovers need          Agent reasons about           Pattern works?
  (plain English)              persona consultation          
        │                             │                           │
        ▼                             ▼                           ▼
  ┌───────────┐              ┌─────────────────┐          ┌──────────────┐
  │ "I want   │   ───────>   │ "Maybe Curator  │  ───────>│ Capture as   │
  │ to check  │              │ + Contrarian    │          │ process      │
  │ my design │              │ can review..."  │          │ insight      │
  │ for flaws"│              │                 │          │              │
  └───────────┘              └─────────────────┘          └──────┬───────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │ Insight      │
                                                          │ enhances     │
                                                          │ future       │◄───┐
                                                          │ behavior     │    │
                                                          └──────────────┘    │
                                                                 │            │
                                                                 └────────────┘
                                                                   (loop)
```

### The Loop in Detail

1. **User discovers need** — Expressed in plain English, possibly ad-hoc in a markdown file or conversation
   
2. **Agent reasons about personas** — "Who can help with this? What combination of consultations might work?"

3. **Pattern works** — The consultation produces useful results

4. **Capture as insight** — The effective pattern gets recorded as a process insight

5. **Insight enhances future** — Future agents (or same agent in new session) can learn from this pattern

6. **Loop continues** — System improves through use

### Self-Improvement Through Use

This creates a **self-improving system**:

- Using LoopFlow teaches it
- Novel use cases become captured patterns
- Captured patterns inform persona behavior
- Better personas enable more novel use cases

The developer isn't just using the tool — they're **teaching it**.

---

## Persona Roster

### Core Personas

| Persona | Domain | Capabilities | Personality |
|---------|--------|--------------|-------------|
| **Curator** | Knowledge & Insights | Search, retrieve, connect insights; identify gaps; suggest related topics | Helpful librarian, knows where everything is |
| **TaskMaster** | Workflow & Planning | Manage backlog, suggest priorities, track progress, scope assessment | Organized PM, keeps things on track |
| **Scholar** | Research & Learning | Web research, doc lookup, build knowledge bases, explain concepts | Curious researcher, loves learning |
| **Contrarian** | Critical Review | Find flaws, devil's advocate, stress-test designs, identify risks | Constructive skeptic, "what could go wrong?" |
| **Council** | Consensus & Decisions | Orchestrate votes, synthesize perspectives, resolve conflicts | Facilitator, fair arbiter |

### Persona Relationships

```
                          ┌─────────────┐
                          │   CODRIVER  │  (Main Agent)
                          │   (You/Me)  │
                          └──────┬──────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
              │  CURATOR  │ │ SCHOLAR │ │TASKMASTER │
              │           │ │         │ │           │
              └─────┬─────┘ └────┬────┘ └─────┬─────┘
                    │            │            │
                    └────────────┼────────────┘
                                 │
                          ┌──────▼──────┐
                          │ CONTRARIAN  │  (Reviews others' outputs)
                          └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                          │   COUNCIL   │  (Resolves disagreements)
                          └─────────────┘
```

### Inter-Persona Communication

Personas can consult each other:

- **Scholar → Curator**: "What do we already know about X before I research?"
- **Contrarian → Curator**: "Show me the assumptions behind this insight"
- **Council → All**: "What's your position on this design decision?"
- **TaskMaster → Curator**: "What insights relate to this task?"

This creates emergent capabilities through persona collaboration.

---

## API Design

### Interaction Semantics

Each persona consultation has:

```typescript
interface PersonaConsultation {
  persona: PersonaType;
  question: string;           // Natural language question
  context?: string;           // What the agent is working on
  constraints?: string[];     // Any constraints on the response
  depth?: 'quick' | 'thorough';  // How deep to go
}

interface PersonaResponse {
  answer: string;             // Natural language response
  confidence: 'high' | 'medium' | 'low';
  sources?: string[];         // Insight IDs, doc references, etc.
  suggestions?: string[];     // Follow-up questions or actions
  gaps?: string[];            // What the persona doesn't know
}
```

### Example Consultations

**Asking the Curator**:
```typescript
ask_curator({
  question: "What testing patterns have we learned in this project?",
  context: "Writing tests for the new search module",
  depth: "thorough"
})

// Response:
{
  answer: "We have 3 relevant insights about testing: INS-034 (verification functions), 
           INS-035 (spec-driven development), INS-037 (property-based testing for 
           constraint satisfaction). The verification function pattern seems most 
           applicable to search — you could write verifiers that check search results 
           match expected relevance ordering.",
  confidence: "high",
  sources: ["INS-034", "INS-035", "INS-037"],
  suggestions: ["Ask Scholar about property-based testing libraries in TypeScript"],
  gaps: ["No insights yet about testing MCP tools specifically"]
}
```

**Asking the Contrarian**:
```typescript
ask_contrarian({
  question: "What could go wrong with our SQLite migration plan?",
  context: "We're moving from JSON files to SQLite as source of truth"
})

// Response:
{
  answer: "Several risks: (1) Migration failures could corrupt data — do you have 
           rollback tested? (2) JSON files becoming 'generated views' means any 
           manual edits get overwritten — is that communicated? (3) FTS5 has 
           different tokenization than simple substring search — edge cases in 
           search behavior? (4) What happens if SQLite file gets corrupted — 
           is there a recovery path from the JSON views?",
  confidence: "medium",
  sources: [],
  suggestions: ["Add acceptance criteria for rollback testing", 
                "Document the 'JSON as views' behavior change"],
  gaps: ["I don't know your backup strategy"]
}
```

**Asking the Council**:
```typescript
ask_council({
  question: "Should we use heuristics or AI for summarization?",
  context: "Designing the summary generation system",
  voters: ["curator", "scholar", "contrarian", "taskmaster"]
})

// Response:
{
  answer: "Council recommendation: Hybrid approach (3-1 vote).
           
           CURATOR: 'Heuristics first — we need summaries even without AI available'
           SCHOLAR: 'AI (Ollama) produces better summaries for complex content'
           CONTRARIAN: 'AI adds latency and failure modes — heuristics more reliable'
           TASKMASTER: 'Hybrid balances speed and quality — ship heuristics, enhance later'
           
           Synthesis: Start with heuristics for MVP, add Ollama as optional enhancement.",
  confidence: "high",
  sources: ["INS-057"],
  suggestions: ["Design the heuristic → AI fallback chain"],
  gaps: []
}
```

---

## Use-Case Driven Development

### The Ad-Hoc Use Case Pattern

Use cases don't need to be pre-planned. They can be:

1. **Discovered in conversation** — "Oh, I wish I could..."
2. **Written in markdown** — A `.loop-flow/use-cases/` folder
3. **Described to the agent** — "Here's what I want to do..."

The agent reasons about how to handle it with personas, and if the pattern works, it becomes a captured insight.

### Use Case Format

```markdown
# Use Case: [Name]

## Need
[Plain English description of what the user wants]

## Context
[When/why this need arises]

## Desired Outcome
[What success looks like]

---

## Agent Reasoning (filled in by agent)
[How the agent decided which personas to consult]

## Consultation Log (filled in by agent)
[Record of persona consultations]

## Outcome
[What happened]

## Insight Captured?
[If this became a process insight, link it]
```

### Example: Ad-Hoc Use Case Discovery

**User says**: "I want to make sure my design doesn't have obvious flaws before I start implementing"

**Agent reasoning**: 
> This is a review task. The Contrarian is designed for finding flaws. 
> But I should also check if the Curator has relevant insights about 
> design review patterns. Let me consult both.

**Consultations**:
1. `ask_curator({ question: "Do we have insights about design review?" })`
2. `ask_contrarian({ question: "Review this design for flaws", context: [design] })`

**Pattern captured as insight**:
> INS-XXX: "Design review workflow: (1) Ask Curator for existing review patterns, 
> (2) Ask Contrarian to stress-test the design, (3) Address Contrarian's concerns, 
> (4) Optionally ask Council if Contrarian and designer disagree."

**Future benefit**: Next time someone wants design review, this pattern is available.

---

## Relationship to Progressive Disclosure Spec

The Progressive Disclosure spec (docs/PROGRESSIVE-DISCLOSURE-SPEC.md) defines the **implementation** — how data is stored, queried, and retrieved efficiently.

This Fluid API Paradigm spec defines the **interaction model** — how agents reason about and use those capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUID API PARADIGM                            │
│         (This spec: interaction model, personas)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PROGRESSIVE DISCLOSURE SPEC                      │
│        (Implementation: SQLite, search, summaries)              │
└─────────────────────────────────────────────────────────────────┘
```

**Curator's brain** = Progressive Disclosure implementation
**How you talk to Curator** = Fluid API Paradigm

---

## Implementation Considerations

### MCP Tool Design

Instead of many specific tools, we might have fewer semantic tools:

```typescript
// Instead of:
loop_scan, loop_expand, loop_timeline, loop_orient, loop_connect, loop_remember...

// We have:
ask_persona({ persona: "curator" | "scholar" | "contrarian" | "taskmaster" | "council", ... })
```

Or each persona could be its own tool:
```typescript
ask_curator({ question, context, depth })
ask_scholar({ question, context, sources })
ask_contrarian({ proposal, context })
ask_taskmaster({ question, context })
ask_council({ question, voters, context })
```

### Persona Implementation

Each persona is implemented as a **system prompt + access to underlying capabilities**:

```typescript
interface Persona {
  name: string;
  systemPrompt: string;           // Personality and approach
  capabilities: string[];          // What tools/data it can access
  canConsult: PersonaType[];      // Which other personas it can ask
}

const curator: Persona = {
  name: "Curator",
  systemPrompt: `You are the Curator, keeper of this project's knowledge...`,
  capabilities: ["search_insights", "search_tasks", "get_timeline", "find_connections"],
  canConsult: ["scholar"]  // Can ask Scholar for research
};
```

### Subagent Architecture

Personas are likely implemented as **subagents** — separate context windows that:
- Have their own system prompts (personality)
- Have access to specific tools (capabilities)
- Return structured responses to the main agent

This aligns with Claude Code's Task tool pattern.

---

## Open Questions

1. **Persona boundaries**: How much overlap should personas have? Should Curator also do light research, or always defer to Scholar?

2. **Inter-persona protocols**: How formal should persona-to-persona communication be? Natural language or structured?

3. **Insight capture trigger**: When does a pattern become an insight? Explicit user confirmation? Agent judgment? Both?

4. **Persona evolution**: Can personas learn and improve independently? Or only through captured insights?

5. **Failure modes**: What happens when personas disagree and Council can't resolve? Escalate to human?

6. **Token economics**: Subagents cost tokens. How do we balance richness of consultation with efficiency?

---

## Next Steps

1. **LF-076**: Deep design of persona architecture with Digital Clockwork Muse integration
2. **LF-077**: Create 5-10 use case examples to validate the paradigm
3. **Review use cases**: Ensure the fluid API can handle diverse needs
4. **Implementation**: Build personas on top of Progressive Disclosure infrastructure

---

## Changelog

- **v0.1** (2026-01-21): Initial paradigm capture from Session 18 breakthrough
