/**
 * LoopFlow Init Command
 * 
 * Initializes LoopFlow for a repository:
 * 1. Creates .loop-flow/ directory
 * 2. Creates SQLite database with schema
 * 3. Seeds database with core process insights
 * 4. Creates WORKFLOW.md with methodology rules
 * 5. Optionally adds hook to AGENTS.md
 */

import * as fs from "fs";
import * as path from "path";
import { openDatabase } from "../db/schema.js";
import { VERSION } from "../index.js";

export interface InitOptions {
  /** Target directory (defaults to cwd) */
  path?: string;
  /** Skip creating/updating AGENTS.md */
  noAgentsMd?: boolean;
  /** Force reinitialize even if .loop-flow exists */
  force?: boolean;
  /** Skip MCP tool configuration wizard */
  noMcp?: boolean;
}

export interface InitResult {
  success: boolean;
  path: string;
  created: string[];
  skipped: string[];
  insightsSeeded: number;
  error?: string;
}

/**
 * Default WORKFLOW.md content for new repos
 */
const DEFAULT_WORKFLOW = `# LoopFlow Workflow Rules

**LoopFlow Version:** ${VERSION}

This file defines how AI agents should work in this repository using the LoopFlow methodology.

LoopFlow is a **theory preservation system** (ref: Naur's "Programming as Theory Building"). The code is the artifact, but the theory in your head is the real product. This workflow helps capture that theory before it's lost.

---

## Philosophy

### Co-Creative Learning

Learning and discovery are not sequential phases — they blend together in a generative loop. The agent's input prompts the human to think deeper about the domain, which surfaces new insights, which the agent helps articulate, which prompts further thinking. 

The agent isn't just extracting knowledge — it's **catalyzing knowledge creation**. This co-creative dialogue is what makes LoopFlow different from a passive note-taking system.

### Modes vs Tasks

- **Modes** are internal vibes the agent spontaneously takes based on context
- **Tasks** are explicit activities requested by the user or proposed by the agent

Modes are fluid and blend; tasks are discrete and trackable. The agent doesn't announce mode switches — it reads the room and adapts.

### Development Approaches

**Vibecode-then-explore**: Instead of Learn → Design → Implement, try Vibecode → Explore → Understand. Build something concrete first (even if messy), then use it as a vehicle for learning. Abstract knowledge doesn't stick until you have something tangible to poke at. The working artifact becomes a teaching tool.

**Vibe-design**: Start with a comprehensive best-effort design, then iterate. Don't over-analyze upfront — draft the full design quickly, then poke holes. The draft becomes a vehicle for discovering what's wrong. This inverts traditional "think deeply first" and instead uses the artifact to surface thinking.

**Use-case driven development**: Development flows from discovered use cases, not pre-planned features. The loop: (1) User discovers a need, (2) Describes it in natural language, (3) Agent reasons about how to address it, (4) If valuable, the pattern becomes a captured insight, (5) Insight informs future behavior.

---

## Core Principles

1. **Developer has the reins**: The developer is in charge. AI agents are tools to help. The developer makes final decisions and MUST design the architecture, data models, and APIs. This isn't just about control — it's about preserving and developing the developer's capacity to think deeply about software.

2. **Ask Questions Before Implementing**: If the requirement is ambiguous, the data model is unclear, or there are multiple implementations, ask for clarification immediately. Ask questions to force the user to think deeply about the problem. The goal is insight, not just answers.

3. **Second order reasoning**: Consider second order effects. Ask the user to consider the second order effects of their design decisions. Help them think, don't think for them.

4. **Foster Learning**: AI should help developers become better engineers, not create dependency. Explain *why*, not just *what*. When possible, teach the underlying concept.

5. **One task, one session**: Complete one focused task per session. No partial progress across sessions. If a task is too big, break it down first.

6. **Capture insights**: Record edge cases, gotchas, domain knowledge, and insights. Knowledge in your context window gets lost between sessions — write it down.

7. **No commit without permission**: AI agents never commit or push without explicit approval.

---

## Session Workflow

\`\`\`
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
\`\`\`

### 1. START — \`loop_orient\`

Call \`loop_orient\` to get full context:
- Workflow rules (this file)
- All insights from the knowledge base
- Task backlog with priorities
- Recent sessions and outcomes
- Suggested actions from previous session

The backlog is a **menu, not a queue** — pick the most valuable task for right now, considering dependencies, priority, and context.

### 2. SELECT — \`loop_task_update\`

- Choose ONE task to work on
- Update status to \`IN_PROGRESS\`: \`loop_task_update(id, status="IN_PROGRESS")\`
- Consider: dependencies, value, complexity
- This is a **sprint board** model, not a linear queue
- If unclear, ask the developer for direction

### 3. IMPLEMENT

- Work on the selected task
- Follow existing patterns in the codebase
- **Business logic MUST be pure functions** (see Architecture section below)
- **Capture insights** with \`loop_remember\` as you discover them
- If subtasks emerge:
  - **Small/necessary** (< 10 min): Just do them, maybe mention "btw handling X"
  - **Medium** (could be own task): Quick check: "Tackle now or add to backlog?"
  - **Large** (scope creep): Add with \`loop_task_create\`, stay focused
  - **Uncertain**: Always ask

### 4. TEST

- Validate your work with tests
- Tests go in \`__tests__/\` folders near the code they test
- Tests must be human-readable: describe INTENT, not mechanics
- Business rule tests should be simple input/output — **no mocks needed**
- Run tests: \`npm test\`
- **No commit if tests fail**

### 5. COMPLETE — \`loop_task_update\`

- Update task status to \`DONE\`: \`loop_task_update(id, status="DONE")\`
- Add notes about what was accomplished if relevant

### 6. HANDOFF — \`loop_handoff\`

End the session gracefully:
\`\`\`
loop_handoff(
  mode="graceful",
  completed=["What was done"],
  next_session_should="What to do next"
)
\`\`\`

This saves state for the next session:
- Suggested actions persisted to database
- Session record created
- JSON files exported for git

**Agent does NOT commit** — developer handles git.

---

## MCP Tools Reference

| Tool | Purpose | When to Use |
|------|---------|-------------|
| \`loop_orient\` | Get full context | Session start |
| \`loop_remember\` | Capture insight | During work, when something feels important |
| \`loop_scan\` | Search summaries | Find relevant insights/tasks |
| \`loop_expand\` | Get full details | After scan, need complete content |
| \`loop_connect\` | Find related items | Exploring connections |
| \`loop_probe\` | Ask user question | Need clarification with options |
| \`loop_handoff\` | End session | Session complete or context filling |
| \`loop_task_create\` | Create task | New work identified |
| \`loop_task_update\` | Update task | Status, priority, notes |
| \`loop_task_list\` | List tasks | See backlog with filters |
| \`loop_insight_update\` | Update insight | Tags, links, status |
| \`loop_update_summary\` | Update repo context | Leave notes for next session |
| \`loop_export\` | Export to JSON | Before git commit |
| \`loop_ui\` | Open web dashboard | Visual view of tasks/insights |

---

## Data Storage

LoopFlow uses SQLite as the source of truth. JSON files are exported for git commits and human review.

| Data | Storage | Export |
|------|---------|--------|
| Tasks | SQLite | \`backlog.json\` |
| Insights | SQLite | \`insights.json\` |
| Sessions | SQLite | (not exported) |
| Repo context | SQLite | (not exported) |

---

## Architecture: Pure Functions for Business Logic

> **This is non-negotiable.** All domain logic MUST be pure functions.

### The Pattern

\`\`\`
Handlers/CLI → Services → Business Rules (PURE) → Repositories → Storage
                              ↑
                    All domain logic lives here
                    No I/O, no side effects
                    Trivially testable
\`\`\`

### What This Means

- **Business Rules** = pure functions: scoring, filtering, validation, transformation, summarization
- **Services** = orchestration + I/O: compose pure functions, handle database/network calls
- **Handlers** = entry points: parse input, call services, format output

### Why This Matters

1. **Testability**: Pure functions are trivially testable with simple assertions
   \`\`\`typescript
   // Good: Pure function, easy to test
   expect(calculateScore(input)).toBe(expectedOutput);
   
   // Bad: Needs mocks, test is brittle
   const mockDb = jest.mock(...);
   \`\`\`

2. **Maintainability**: Business rules are isolated from infrastructure concerns
3. **Debuggability**: Same input always produces same output
4. **Refactorability**: Can change storage/transport without touching logic

### Red Flags

If you find yourself:
- Needing mocks to test business logic → **architecture is wrong**
- Putting database calls inside calculation functions → **refactor immediately**
- Having conditional logic based on I/O results mixed with domain logic → **separate them**

### Example Structure

\`\`\`
src/
  rules/           # Pure functions (business logic)
    scoring.ts     # calculateScore(input) → score
    validation.ts  # validateTask(task) → Result
    transform.ts   # transformData(data) → newData
  services/        # Orchestration + I/O
    task-service.ts    # Uses rules + repositories
  db/
    repositories/  # Data access (I/O boundary)
\`\`\`

---

## Task Schema

\`\`\`json
{
  "id": "LF-XXX",
  "title": "[TYPE] Short descriptive title",
  "description": "What needs to be done and why",
  "status": "TODO | IN_PROGRESS | DONE | BLOCKED | CANCELLED",
  "priority": "high | medium | low",
  "depends_on": ["LF-YYY"],
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "notes": "Optional context"
}
\`\`\`

### Task Types (Title Prefixes)

| Prefix | Purpose | When to Use |
|--------|---------|-------------|
| \`[IMPL]\` | Implementation work | Writing code, tests, documentation |
| \`[DESIGN]\` | Discussion/decision task | Architecture, data models, API design — think before coding |
| \`[SPIKE]\` | Exploratory research | Reduce uncertainty before committing to an approach |
| \`[LEARN]\` | Acquire external knowledge | Understand docs, libraries, domains |
| \`[REVIEW]\` | Audit existing code/docs | Code review, TODO triage, documentation audit |
| \`[BUG]\` | Fix a defect | Something is broken and needs fixing |
| \`[DOCS]\` | Documentation | README, guides, API docs |

Design tasks come first — make decisions before coding.

---

## Insight Capture

Insights are **project-specific learnings** that form a knowledge graph. They capture what you learn about *this* project — not general methodology (that's in this WORKFLOW.md file).

### Insight Types

| Type | Leverage | What to Capture | Example |
|------|----------|-----------------|---------|
| \`domain\` | Highest | Problem space knowledge, business rules, user expectations | "Users expect weekly reports on Mondays" |
| \`architecture\` | High | Design decisions and rationale | "Chose SQLite for single-file deployment" |
| \`edge_case\` | Medium | Non-obvious behavior, gotchas | "API returns null for empty arrays, not []" |
| \`technical\` | Lower | Useful tricks, patterns, how-tos | "Use discriminated unions for state machines" |

**Note:** Methodology learnings (how to work) belong in WORKFLOW.md, not as insights. Insights are project-specific.

### Capture with \`loop_remember\`

\`\`\`
loop_remember(
  content="The insight text",
  type="domain",
  tags=["relevant", "tags"]
)
\`\`\`

**Quick capture** — Don't derail the current task. Snapshot and keep going.

### Proactive Capture

AI agents should **proactively probe for emerging insights**. When an idea starts floating around but isn't yet articulated, help surface it.

Entry points:
- **User says "Note: ..."** → capture immediately
- **Agent notices insight** → ask "Worth capturing?"
- **Emerging idea** → help articulate it

---

## Scope Management

### One Task = One Session
- A backlog task should be completable within one context window
- No partial progress across sessions
- **No context compaction** (causes context rot)

### Session Boundaries

End a session when:
- Task is complete
- Natural stopping point reached
- Context window is filling up (better to handoff clean than compact)

---

## Communication Protocol

### Always Ask When:
- Scope is ambiguous
- A task seems too large for one session
- Trade-offs need developer input
- You want to add significant new tasks
- Architectural decisions need review

### Always Capture When:
- You discover a pattern worth documenting
- A non-obvious insight emerges
- Domain knowledge is shared
- An architectural decision is made

---

## Anti-Patterns

- **Don't** do multiple backlog tasks in one session
- **Don't** leave tests failing at end of session
- **Don't** make large architectural changes without asking
- **Don't** assume user intent — ask when uncertain
- **Don't** commit or push without permission
- **Don't** use context compaction (causes context rot)
- **Don't** treat the backlog as a queue — it's a menu

---

## Customization

Edit this file to add project-specific rules, conventions, or workflow adjustments.
The agent reads this on every \`loop_orient\` call.

---

*"One task, one session, one handoff. Tests pass. Context stays fresh."*
`;

/**
 * AGENTS.md hook content
 */
const AGENTS_HOOK = `
## LoopFlow Workflow

This project uses LoopFlow for AI-assisted development.

**At the start of every session**, call the \`loop_orient\` MCP tool to get situational awareness.

See \`.loop-flow/WORKFLOW.md\` for methodology details.
`;

/**
 * Initialize LoopFlow for a repository
 */
export async function initLoopFlow(options: InitOptions = {}): Promise<InitResult> {
  const targetPath = options.path || process.cwd();
  const loopFlowDir = path.join(targetPath, ".loop-flow");
  
  const result: InitResult = {
    success: false,
    path: targetPath,
    created: [],
    skipped: [],
    insightsSeeded: 0,
  };

  try {
    // Check if already initialized
    if (fs.existsSync(loopFlowDir) && !options.force) {
      const dbExists = fs.existsSync(path.join(loopFlowDir, "loopflow.db"));
      if (dbExists) {
        result.error = "LoopFlow already initialized. Use --force to reinitialize.";
        return result;
      }
    }

    // Create directory
    if (!fs.existsSync(loopFlowDir)) {
      fs.mkdirSync(loopFlowDir, { recursive: true });
      result.created.push(".loop-flow/");
    }

    // Create SQLite database (no seeding - methodology is in WORKFLOW.md)
    const dbPath = path.join(loopFlowDir, "loopflow.db");
    const dbExisted = fs.existsSync(dbPath);
    const db = openDatabase(dbPath);
    db.close();
    
    if (!dbExisted) {
      result.created.push(".loop-flow/loopflow.db");
    } else {
      result.skipped.push(".loop-flow/loopflow.db (already exists)");
    }

    // Create WORKFLOW.md
    const workflowPath = path.join(loopFlowDir, "WORKFLOW.md");
    if (!fs.existsSync(workflowPath)) {
      fs.writeFileSync(workflowPath, DEFAULT_WORKFLOW);
      result.created.push(".loop-flow/WORKFLOW.md");
    } else {
      result.skipped.push(".loop-flow/WORKFLOW.md (already exists)");
    }

    // Handle AGENTS.md
    if (!options.noAgentsMd) {
      const agentsMdPath = path.join(targetPath, "AGENTS.md");
      
      if (fs.existsSync(agentsMdPath)) {
        // Check if hook already exists
        const content = fs.readFileSync(agentsMdPath, "utf-8");
        if (!content.includes("loop_orient")) {
          // Append hook to existing AGENTS.md
          fs.appendFileSync(agentsMdPath, "\n" + AGENTS_HOOK);
          result.created.push("AGENTS.md (hook added)");
        } else {
          result.skipped.push("AGENTS.md (hook already present)");
        }
      } else {
        // Create new AGENTS.md with just the hook
        const newAgentsMd = `# Agent Instructions\n${AGENTS_HOOK}`;
        fs.writeFileSync(agentsMdPath, newAgentsMd);
        result.created.push("AGENTS.md");
      }
    }

    result.success = true;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Format init result for CLI output (used when wizard is skipped)
 */
export function formatInitResult(result: InitResult): string {
  const lines: string[] = [];
  
  if (result.success) {
    lines.push(`✓ LoopFlow initialized in ${result.path}`);
    lines.push("");
    
    if (result.created.length > 0) {
      lines.push("Created:");
      result.created.forEach(f => lines.push(`  + ${f}`));
    }
    
    if (result.skipped.length > 0) {
      lines.push("");
      lines.push("Skipped:");
      result.skipped.forEach(f => lines.push(`  - ${f}`));
    }
    
  } else {
    lines.push(`✗ Initialization failed: ${result.error}`);
  }
  
  return lines.join("\n");
}
