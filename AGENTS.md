# LoopFlow Development Rules

## Project Overview

**LoopFlow** is an MCP server that provides structured AI-assisted development workflows. It manages tasks, sessions, learnings, and context across multiple repositories.

**Tech Stack**: TypeScript, Node.js, SQLite, MCP Protocol

---

## LoopFlow Workflow

This project uses the LoopFlow workflow for AI-assisted development sessions.

**At the start of every session**, call the `loop_orient` MCP tool to get situational awareness (current task, hot insights, suggested next steps).

To temporarily disable LoopFlow, comment out or delete the line above.

---

## Project-Specific Rules

### Architecture
- Design for change and scalability. Anticipate change as a constant.
- Prioritize loose coupling. Changes to one module shouldn't cascade through others.
- Code against abstractions (interfaces), not concrete implementations.
- Prefer composition over inheritance.
- Avoid global mutable state.

### Contracts & Interfaces
- Define explicit interfaces at system boundaries.
- Use TypeScript interfaces for component props and function parameters.
- Document inputs/outputs with JSDoc.
- Clear contracts between components.

### Process
- **Understand before changing**: Read existing code, check related files, understand data flow.
- **Follow existing patterns** before inventing new approaches.
- **DRY**: Every piece of knowledge should have a single, authoritative representation.
- **Orthogonality**: Changes in one feature should not break unrelated features.

### Code Quality
- Fix linting errors immediately.
- Remove unused imports and delete dead code.
- Don't leave bad code lying around—a single broken window invites more.
- Good Enough Software: Perfect is the enemy of shipped.

### Development Approach
- **Tracer Bullets**: Build thin, end-to-end slices first to validate architecture.
- **Easy to change?**: Ask "does this decision make things easier to change in the future?"

---

## Coding Standards

- **TypeScript strict mode** - Always.
- **Avoid `any`**: Prefer explicit, well-defined types.
- **Minimize nullable types**: Use them intentionally (e.g., `deletedAt: Date | null`), not by default.
- **Crash Early**: Fail fast with clear errors rather than propagating bad state.
- **Use Assertions**: Validate assumptions explicitly at system boundaries.
- **Descriptive Errors**: Error messages should help diagnose the problem. Log with sufficient context.
- **Refactor Early, Refactor Often**: Improve code as you touch it.
- **Pure functions** for business logic. Side effects at boundaries (CLI, MCP handlers, DB).
- **Test Critical Paths**: Focus testing on high-impact flows.
- **Design for unit testing**: Keep business logic as pure functions. Avoid external dependencies.
- **Prefer generated data over mocks**: For integration tests, generate realistic test scenarios.
- **Code as Documentation**: Use clear naming. Comments explain _why_, not _what_.
- **Simplicity wins**: Avoid cleverness. Simple is better than complex.
