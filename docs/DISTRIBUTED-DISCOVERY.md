# Distributed Domain Discovery

> Using AI agents as parallel interviewers to extract tacit knowledge from teams.

---

## The Problem

Domain knowledge lives in people's heads. Getting it out is hard:

- **Meetings are expensive** - Scheduling, coordination, everyone's time
- **Knowledge is tacit** - People don't know what they know until asked
- **Expertise is distributed** - Different people know different pieces
- **Documentation drifts** - Written docs often don't match reality

Traditional approaches:
- Group workshops (high overhead, groupthink risk)
- 1:1 interviews (doesn't scale, interviewer fatigue)
- Surveys (shallow, miss the "oh but actually..." moments)

---

## The Pattern

**Embed an AI interviewer in the codebase** via a special `MINILOOP.md` file.

When team members interact with their AI assistant in that context, the AI runs a structured domain discovery session:

```
┌──────────────────────────────────────────────────────────────────┐
│  Developer opens branch with packages/foo/MINILOOP.md             │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AI reads MINILOOP.md "program"                           │    │
│  │  • Introduces session, asks permission                  │    │
│  │  • Creates unique output file                           │    │
│  │  • Runs structured interview                            │    │
│  │  • Probes for edge cases, contradictions, workarounds   │    │
│  │  • Captures verbatim quotes                             │    │
│  │  • Synthesizes and saves                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  Developer commits session-{name}-{date}.md                     │
│                              │                                   │
│                              ▼                                   │
│  Lead synthesizes all sessions into domain model                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Why This Works

### Advantages over human interviewers

| Factor | Human Interviewer | AI Interviewer |
|--------|-------------------|----------------|
| Scheduling | Needs coordination | Async, whenever convenient |
| Social pressure | "I should know this" | Easier to admit uncertainty |
| Consistency | Varies with fatigue | Follows protocol exactly |
| Capture quality | Paraphrases, summarizes | Records verbatim quotes |
| Scaling | One at a time | Parallel across team |
| Cost | High (senior time) | Low (compute) |

### Advantages over surveys/forms

- **Conversational** - Follows interesting threads, asks clarifying questions
- **Adaptive** - Digs deeper when something surprising emerges
- **Contextual** - Can reference code, docs, existing domain model
- **Rich output** - Captures nuance, quotes, contradictions

### What it's good for

- Extracting technical domain knowledge
- Validating documented models against reality
- Discovering edge cases and workarounds
- Finding terminology mismatches
- Onboarding new team members (reverse direction - teach then probe)

### What it's NOT good for

- Reading political dynamics
- Detecting hesitation/discomfort about topics
- Navigating organizational sensitivities
- Replacing relationship-building conversations

---

## MINILOOP.md Structure

The `MINILOOP.md` file is a "program" that AI agents execute. Key sections:

### 1. Context

Brief background so the AI understands the domain and goals:

```markdown
## Context (Read This First)

You're helping with a **domain discovery session** for [package/feature].
The goal is to extract tacit knowledge about how [thing] actually works.

**Background**: [2-3 sentences of context]
**Your role**: Be a curious interviewer. Probe for edge cases...
```

### 2. Session Protocol

Step-by-step instructions for the AI:

```markdown
## Session Protocol

### 1. INTRODUCE
Say something like: "Hey! I see you're on [branch]. I'm set up to run 
a domain discovery session..."

### 2. IDENTIFY
Ask for their name/identifier for the output file.

### 3. PROBE
[Structured areas to explore with example questions]

### 4. SYNTHESIZE
Summarize what you learned and verify with the participant.

### 5. SAVE
Write to discovery/session-{name}-{date}.md

### 6. CLOSE
Thank them, explain next steps.
```

### 3. Probe Areas

Domain-specific questions organized by topic:

```markdown
#### Area 1: [Topic]

Current model says: "[What documentation claims]"

Probe:
- "Walk me through [concrete action]. What actually happens?"
- "What happens when [edge case]?"
- "Is there anything that works differently than you'd expect?"
```

### 4. Reference Material

Include the current documented model so AI can spot contradictions:

```markdown
## Reference: Current Domain Model

| Term | Our Definition |
|------|----------------|
| Foo  | The thing that... |
| Bar  | When a user... |

Use this to spot mismatches with what the participant describes.
```

---

## Output Format

Each session produces a file like `discovery/session-alex-2026-01-20.md`:

```markdown
# Domain Discovery - Alex

**Date**: 2026-01-20
**Participant**: Alex
**Role**: Backend dev, works on B2B features

## Key Insights

1. **Classes don't have schedules**: "We just use them as containers, 
   the schedule lives in the instructor's head"

2. **Assignment duplication is intentional**: Same homework assigned 
   via class AND directly creates two separate entries - this is 
   how they handle "extra credit"

## Model Mismatches

- Documentation says Tasks and Assignments are separate concepts,
  but Alex thinks of them as one thing: "I create an assignment 
  and give it to students"

## Edge Cases Discovered

- Students can be in multiple classes with different instructors
- Removing a student from a class doesn't delete their attempts

## Pain Points

- "The most annoying thing is I can't reuse a homework I made 
  for a different class last month"

## Quotes

> "Honestly, I just think of it as homework. The task/assignment 
> distinction doesn't match how teachers talk about it." 
> — on terminology

## Open Questions

- What happens to a student's data if the organization is deleted?
- Do we ever need to re-open a submitted assignment?
```

---

## Synthesis Process

After collecting sessions from multiple team members:

1. **Aggregate** - Gather all session files
2. **Identify patterns** - What do multiple people agree on?
3. **Flag contradictions** - Where do mental models differ?
4. **Extract terminology** - What words do people actually use?
5. **Update documentation** - Revise domain model based on findings
6. **Create follow-up tasks** - Investigate unresolved questions

Example synthesis insight:

> **Finding**: 3/4 participants don't distinguish Task from Assignment.
> They say "create homework and assign it" as one action.
> 
> **Implication**: Our domain model separation may not match user mental model.
> Consider: Is this an education problem or a model problem?

---

## Integration with Loop-Flow

### As a Task Type

Add `[DISCOVERY]` prefix for distributed discovery tasks:

```json
{
  "id": "B2B-004",
  "title": "[DISCOVERY] Distributed team interview - B2B domain",
  "description": "Run MINILOOP.md interview sessions with team",
  "acceptance_criteria": [
    "At least 3 team members complete sessions",
    "Sessions committed to discovery/ folder",
    "Synthesis document created with findings"
  ]
}
```

### Capture as Insights

Key findings become entries in `insights.json`:

```json
{
  "id": "INS-042",
  "content": "Team doesn't distinguish Task from Assignment...",
  "type": "domain",
  "status": "discussed",
  "tags": ["b2b", "terminology", "discovery"],
  "source": "Distributed discovery - B2B (3 sessions)"
}
```

---

## Best Practices

### Writing Probe Questions

**Good probes** (concrete, behavioral):
- "Walk me through creating a new class. What do you enter?"
- "What happens if a student is removed mid-assignment?"
- "What's the most annoying workaround you use?"

**Bad probes** (abstract, yes/no):
- "Do you think the class model is good?"
- "Is the assignment system confusing?"
- "Are there any problems?"

### Tone Guidelines

The AI should be:
- **Curious, not interrogative** - "Tell me more" not "Explain why"
- **Accepting of uncertainty** - "That's fine, let's move on" not "But you must know"
- **Following threads** - If something interesting emerges, dig deeper
- **Non-correcting** - Don't teach the "right" answer, learn how they think

### Handling Resistance

If participant declines or is busy:
```
"No problem! I'll just help with whatever you're working on. 
Let me know if you want to do this later."
```

Never pressure. The value comes from willing, thoughtful participation.

---

## Example: B2B Domain Discovery

See the working example in WPTP's codebase:

- `packages/b2b/MINILOOP.md` - The interview program
- `packages/b2b/discovery/` - Where sessions are stored
- `packages/b2b/GLOSSARY.md` - Terminology being validated

This pattern discovered:
- Task vs Assignment distinction doesn't match teacher mental model
- "Homework" is the universal term, not "Task" or "Assignment"
- Students being in multiple classes is common, not edge case
- Instructors want to reuse content across classes (missing feature)

---

## Future Directions

### Automated Synthesis

AI-assisted synthesis across sessions:
- Pattern detection across multiple sessions
- Contradiction highlighting
- Suggested domain model updates

### Bidirectional Learning

Same MINILOOP.md can work in two modes:
1. **Extract mode**: Probe expert for tacit knowledge
2. **Teach mode**: Onboard newcomer with the documented model

The session detects which mode based on participant responses.

### Cross-Team Discovery

Run discovery across organizational boundaries:
- Engineering vs Product vs Support
- Different mental models surface as insights
- Helps align terminology across teams

---

*"The best documentation comes from asking the right questions."*
