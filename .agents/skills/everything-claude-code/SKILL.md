---
name: everything-claude-code
description: "Use when needing development conventions and patterns for everything-claude-code. JavaScript project with conventional commits."
---

# Everything Claude Code Conventions

Conventions and development patterns used across the `everything-claude-code` repository.

## Overview & Tech Stack

- **Primary Language**: JavaScript / Node.js
- **Architecture**: Hybrid module organization (single root package)
- **Test Pattern**: `*.test.js` (unit and integration tests, 80%+ coverage target)

## When to Use This Skill

- Contributing changes, rules, skills, agents, or hooks to `everything-claude-code`
- Writing unit or integration tests matching repository patterns
- Formatting conventional commit messages

## Commit Conventions

Follow Conventional Commits with concise, descriptive summaries in imperative mood:
- `feat(scope)`: New agent, skill, rule, or capability (e.g. `feat(rules): add Rust language rules`)
- `fix(scope)`: Bug fixes or catalog synchronizations (e.g. `fix: sync catalog counts with filesystem`)
- `docs(scope)`: Documentation, guides, or skill copy updates (e.g. `docs: add Antigravity setup guide`)
- `test(scope)`: Test additions or test framework updates
- `chore(deps)`: Dependency upgrades or maintenance

## Architecture & Code Style

### Naming & Modules
| Element | Convention | Example |
|---|---|---|
| Files & Functions | `camelCase` | `useAuth`, `auditCustomizations` |
| Classes | `PascalCase` | `ValidationEngine` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_SKILL_LINES` |
| Imports | Relative paths | `import { Button } from '../components/Button'` |

### Error Handling
Always wrap external I/O or fallible operations in `try-catch` blocks with actionable error messages:
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(`Failed to complete operation: ${error.message}`);
}
```

## Common Workflows

### 1. Adding a New Skill
1. Create directory under `skills/{skill-name}/`.
2. Add `SKILL.md` with YAML frontmatter, When to Use, Core Rules, Examples, and Anti-Patterns.
3. Keep `SKILL.md` strictly under 350 lines (extract deep reference tables to `references/` if necessary).
4. Optionally place scripts under `skills/{skill-name}/scripts/`.

### 2. Adding Language Rules
1. Create directory under `rules/{language}/`.
2. Add modular files: `coding-style.md`, `hooks.md`, `patterns.md`, `security.md`, and `testing.md`.
3. Reference complementary skills where appropriate.

### 3. Adding a New Agent
1. Create agent definition under `agents/{agent-name}.md`.
2. Register the agent in `AGENTS.md` and update `docs/COMMAND-AGENT-MAP.md`.

### 4. Adding or Updating Hooks
1. Place executable hooks in `hooks/` or `scripts/hooks/`.
2. Register the hook in `hooks/hooks.json`.
3. Add automated test coverage under `tests/hooks/`.

### 5. Synchronizing Catalog Counts & Cross-Harness Copies
- Run catalog sync scripts to ensure `AGENTS.md`, `README.md`, and manifest counts match the filesystem.
- When mirroring to multiple harnesses (Codex, Cursor, Antigravity), mirror canonical skills to `.agents/skills/` and `.cursor/skills/`.

## Best Practices Checklist

- [ ] Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).
- [ ] Maintain test coverage with `*.test.js` pattern.
- [ ] No hardcoded absolute paths or uncontrolled side-effects.
- [ ] Never mix unrelated concerns in a single PR.

> [!IMPORTANT]
> **Rule Adherence**: Always strictly follow the `everything-claude-code` conventions outlined above to ensure workspace consistency and prevent regressions.
