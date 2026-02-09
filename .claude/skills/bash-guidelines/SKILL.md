---
name: bash-guidelines
description: Guidelines for bash commands in this environment
user-invocable: false
---

# Bash Command Guidelines

The user has `cd` aliased to zoxide's `z` command. This does NOT work in non-interactive shells like Claude Code's Bash tool, causing `cd:1: command not found: __zoxide_z` errors.

## NEVER do this:
```bash
cd /some/path && npm run build
```

## DO this instead:

### Use absolute paths directly:
```bash
npm run build --prefix "/Users/nickzou/Documents/Development Projects/life-assistant/life-assistant-frontend"
```

### Use tool-specific directory flags:
```bash
git -C "/path/to/repo" status
git -C "/path/to/repo" commit -m "message"
```

### Wrap in bash -c when directory change is necessary:
```bash
bash -c 'cd "/path/to/dir" && npm run build'
```

### Use set -a for sourcing env files:
```bash
bash -c 'set -a && source "/path/to/.env" && some_command'
```

Always prefer absolute paths over changing directories.
