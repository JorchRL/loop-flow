# Cursor MCP Configuration

This guide explains how to configure Cursor to use the LoopFlow MCP server.

## Prerequisites

1. **Node.js 18+** installed
2. **LoopFlow** installed globally:
   ```bash
   npm install -g loop-flow
   ```
3. **LoopFlow initialized** in your project:
   ```bash
   cd your-project
   loopflow init
   ```

## Configuration

### Option 1: Project-level config (Recommended)

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "loopflow": {
      "command": "loopflow",
      "args": ["mcp"]
    }
  }
}
```

This ensures LoopFlow is available when working in this project.

### Option 2: Global config

For system-wide availability, add to your Cursor settings:

1. Open Cursor Settings (`Cmd+,` on Mac, `Ctrl+,` on Windows/Linux)
2. Search for "MCP"
3. Add the LoopFlow server configuration

## Verification

After configuration:

1. Restart Cursor
2. Open a project with LoopFlow initialized
3. Open a new chat
4. Type: "Call loop_orient to start a LoopFlow session"

You should see the agent call the `loop_orient` tool and receive context about your project.

## Using LoopFlow

### Starting a session

Tell the agent:
> "loopstart"

Or explicitly:
> "Call loop_orient to get project context"

### During work

The agent can:
- Capture insights: `loop_remember`
- Search knowledge: `loop_scan`, `loop_connect`
- Manage tasks: `loop_task_create`, `loop_task_update`, `loop_task_list`

### Ending a session

> "End the session gracefully"

The agent calls `loop_handoff` to save state for the next session.

## Troubleshooting

### "No .loop-flow directory found"

Run `loopflow init` in your project directory first.

### Server not appearing in Cursor

1. Verify installation: `loopflow --version`
2. Check the MCP config file location (`.cursor/mcp.json`)
3. Restart Cursor completely (not just reload)

### Server starts but tools fail

1. Check that `.loop-flow/` exists in your project
2. Verify the SQLite database was created: `ls .loop-flow/loopflow.db`
3. Try reinitializing: `loopflow init --force`

### Permission errors

If `loopflow` command is not found:
```bash
# Check npm global bin is in PATH
npm bin -g

# Or use npx
npx loop-flow mcp
```

Update your mcp.json to use npx if needed:
```json
{
  "mcpServers": {
    "loopflow": {
      "command": "npx",
      "args": ["loop-flow", "mcp"]
    }
  }
}
```

## Advanced Configuration

### Custom working directory

If you want to specify a different repo path:

```json
{
  "mcpServers": {
    "loopflow": {
      "command": "loopflow",
      "args": ["mcp"],
      "env": {
        "LOOPFLOW_REPO": "/path/to/your/project"
      }
    }
  }
}
```

### Multiple projects

Each project should have its own `.loop-flow/` directory. The MCP server detects the LoopFlow root by walking up from the current working directory.

## See Also

- [README.md](../README.md) - Quick start guide
- [docs/DESIGN.md](./DESIGN.md) - Technical architecture
