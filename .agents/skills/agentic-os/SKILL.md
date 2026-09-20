---
name: agentic-os
description: "Use when building a persistent multi-agent system on Claude Code with its own memory, commands, and scheduling. — Build persistent multi-agent operating systems on Claude Code. Covers kernel architecture, specialist agents, slash commands, file-based memory, scheduled automation, and state management without external databases"
metadata:
  origin: ECC
---

# Agentic OS

Treat Claude Code as a persistent runtime / operating system rather than a chat session. This skill codifies the architecture used by production agentic setups: a kernel config that routes tasks to specialist agents, persistent file-based memory, scheduled automation, and a JSON/markdown data layer.

## When to Activate

- Building a multi-agent workflow inside Claude Code
- Setting up persistent Claude Code automation that survives session restarts
- Creating a "personal OS" or "agentic OS" for recurring tasks
- User says "agentic OS", "personal OS", "multi-agent", "agent coordinator", "persistent agent"
- Structuring long-running projects where context must survive across sessions

## Architecture Overview

The Agentic OS has four layers. Each layer is a directory in your project root.

```
project-root/
├── CLAUDE.md          # Kernel: identity, routing rules, agent registry
├── agents/            # Specialist agent definitions (markdown prompts)
├── .claude/commands/  # Slash commands: user-facing CLI
├── scripts/           # Daemon scripts: scheduled or event-driven tasks
└── data/              # State: JSON/markdown filesystem, no external DB
```

### Layer Responsibilities

| Layer | Purpose | Persistence |
|---|---|---|
| Kernel (`CLAUDE.md`) | Identity, routing, model policies, agent registry | Git-tracked |
| Agents (`agents/`) | Specialist identities with scoped tools and memory | Git-tracked |
| Commands (`.claude/commands/`) | User-facing slash commands (`/daily-sync`, `/outreach`) | Git-tracked |
| Scripts (`scripts/`) | Python/JS daemons triggered by cron or webhooks | Git-tracked |
| State (`data/`) | Append-only logs, project state, decision records | Git-ignored or tracked |

## The Kernel

`CLAUDE.md` is the kernel. It acts as the COO / orchestrator. Claude reads it at session start and uses it to route work.

### Kernel Structure

```markdown
# CLAUDE.md - Agentic OS Kernel

## Identity
You are the COO of [project-name]. You route tasks to specialist agents.
You never write code directly. You delegate to the right agent and synthesize results.

## Agent Registry

| Agent | Role | Trigger |
|---|---|---|
| @dev | Code, architecture, debugging | User says "build", "fix", "refactor" |
| @writer | Documentation, content, emails | User says "write", "draft", "blog" |
| @researcher | Research, analysis, fact-checking | User says "research", "analyze", "compare" |
| @ops | DevOps, deployment, infrastructure | User says "deploy", "CI", "server" |

## Routing Rules
1. Parse the user request for intent keywords
2. Match to the Agent Registry trigger column
3. Load the corresponding agent file from `agents/<name>.md`
4. Hand off execution with full context
5. Synthesize and present the result back to the user

## Model Policies
- Default model: use the repository or harness default.
- @dev tasks: prefer a higher-reasoning model for complex architecture.
- @researcher tasks: use the configured research-capable model and approved search tools.
- Cost ceiling: warn before exceeding the project's configured spend threshold.
```

### Key Principle

The kernel should be **small and declarative**. Routing logic lives in plain markdown tables, not code. This makes the system inspectable and editable without debugging.

## Specialist Agents

Each agent is a standalone markdown file in `agents/`. Claude loads the relevant agent file when routing a task.

### Agent Definition Format

```markdown
# @dev - Software Engineer

## Identity
You are a senior software engineer. You write clean, tested, production-grade code.
You prefer simple solutions. You ask clarifying questions when requirements are ambiguous.

## Memory Scope
- Read `data/projects/<current-project>.md` for context
- Read `data/decisions/` for architectural decisions
- Append execution logs to `data/logs/<date>-@dev.md`

## Tool Access
- Full filesystem access within project root
- Git operations (status, diff, commit, branch)
- Test runner access
- MCP servers as configured in `.claude/mcp.json`

## Constraints
- Always write tests for new features
- Never commit directly to `main`; use feature branches
- Prefer editing existing files over creating new ones
- Keep functions under 50 lines when possible
```

### Multi-Agent Collaboration Pattern

When a task spans multiple agents, the kernel runs them sequentially or in parallel:

```
User: "Build a landing page and write the launch blog post"

Kernel routing:
1. @dev - "Build a landing page with [requirements]"
2. @writer - "Write a launch blog post for [product] using the landing page copy"
3. Kernel synthesizes both outputs into a unified response
```

For parallel execution, use Claude Code's background task capability or shell scripts that invoke Claude Code with specific agent contexts.

## Commands and Daily Workflows

Slash commands are markdown files in `.claude/commands/`. They define reusable workflows.

### Command Structure

```markdown
# /daily-sync

Run the morning briefing:

1. Read `data/logs/last-sync.md` for context
2. Check project status: `git status`, pending PRs, CI health
3. Review `data/inbox/` for new tasks or decisions needed
4. Generate a summary of blockers, priorities, and next actions
5. Append the briefing to `data/logs/daily/<date>.md`
```

### Standard Command Set

| Command | Purpose |
|---|---|
| `/daily-sync` | Morning briefing: status, blockers, priorities |
| `/outreach` | Run outreach workflow (email, LinkedIn, etc.) |
| `/research <topic>` | Deep research with citation tracking |
| `/apply-jobs` | Tailor resume + cover letter for a target role |
| `/analytics` | Pull metrics from Stripe, GitHub, or custom sources |
| `/interview-prep` | Generate flashcards or mock interview questions |
| `/decision <topic>` | Log a decision with pros/cons and chosen path |

### Activating Commands

Place command files in `.claude/commands/<command-name>.md`. Claude Code auto-discovers them. Users invoke them with `/<command-name>`.

## Persistent Memory

Memory is file-based. No vector DB, no Redis, no PostgreSQL. JSON and markdown files in `data/` are the database.

### Memory Directory Structure

```
data/
├── daily-logs/         # Append-only daily activity logs
├── projects/           # Per-project context files
├── decisions/          # Architectural and business decisions (ADR format)
├── inbox/              # New tasks or ideas awaiting triage
├── contacts/           # People, companies, relationship notes
└── templates/          # Reusable prompts and formats
```

### Daily Log Format

```markdown
# 2026-04-22 - Daily Log

## Sessions
- 09:00 - Session 1: Refactored auth module (@dev)
- 11:30 - Session 2: Drafted investor update (@writer)

## Decisions
- Switched from JWT to session cookies (see `data/decisions/2026-04-22-auth.md`)

## Blockers
- Waiting on API key from vendor (follow up 2026-04-24)

## Next Actions
- [ ] Merge auth refactor PR
- [ ] Send investor update for review
```

### Auto-Reflection Pattern

At the end of each session, the kernel appends a reflection:

```markdown
## Reflection - Session 3
- What worked: Parallel agent execution saved 20 minutes
- What didn't: @researcher hit a paywalled source, need better source ranking
- What to change: Add `source-tier` field to research notes (A/B/C credibility)
```

This creates a feedback loop that improves the system over time without code changes.

## Scheduled Automation

Agentic OS tasks run on a schedule using external cron, not Claude Code's built-in cron (which dies when the session ends).

### macOS: LaunchAgent

```xml
<!-- ~/Library/LaunchAgents/com.agentic.daily-sync.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agentic.daily-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/claude</string>
        <string>--cwd</string>
        <string>/path/to/project</string>
        <string>--command</string>
        <string>/daily-sync</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>8</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/agentic-daily-sync.log</string>
</dict>
</plist>
```

### Linux: systemd Timer

```ini
```bash
# pm2 (Cross-Platform) ecosystem.config.js
module.exports = {
  apps: [{
    name: 'agentic-daily-sync', script: 'claude',
    args: '--cwd /path/to/project --command /daily-sync',
    cron_restart: '0 8 * * *', autorestart: false
  }]
};
```

## Data Layer

The data layer is your local filesystem. Use JSON for structured state and markdown for narrative records.

### JSON State & Schema Evolution

```json
// data/projects/website-v2.json
{
  "name": "Website v2", "status": "in-progress",
  "agents_involved": ["@dev", "@writer"],
  "_deprecated_priority": "high",
  "priority_v2": { "level": "high", "rationale": "Blocks launch" }
}
```

Never rename existing fields — append new ones to preserve historical readability without database migration scripts.

## Anti-Patterns

- **Monolithic Agent**: Putting full-stack, writer, ops, and research in one agent. *Fix: Split into specialist markdown files.*
- **Stateless Sessions**: Opening fresh sessions without reading `data/`. *Fix: Read project state on start; append logs on finish.*
- **Hardcoded Credentials**: Putting API keys in `CLAUDE.md`. *Fix: Use environment variables (`process.env`).*
- **Premature Database**: Spinning up PostgreSQL for single-user OS. *Fix: Stick to JSON/markdown files.*
- **Imperative Routing**: Writing complex routing code. *Fix: Keep routing declarative in `CLAUDE.md` tables.*

## Best Practices

- [ ] `CLAUDE.md` is under 200 lines and fits in context window
- [ ] Each agent file is under 100 lines and focused on one domain
- [ ] `data/` is git-ignored for sensitive logs, git-tracked for decisions and specs
- [ ] Commands use imperative names: `/daily-sync`, not `/run-daily-sync`
- [ ] Logs are append-only; never edit past daily logs
- [ ] Every agent has a `Memory Scope` section defining what files it reads
- [ ] Reflections are written at the end of every session
- [ ] Scheduled tasks use external cron (LaunchAgent, systemd, pm2), not Claude Code's session cron
- [ ] Cost tracking: log API spend per session in `data/logs/<date>-costs.json`
- [ ] One project = one Agentic OS. Do not share a single `CLAUDE.md` across unrelated projects.
