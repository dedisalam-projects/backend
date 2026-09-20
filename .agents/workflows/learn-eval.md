---
description: "Extract reusable patterns from the session, self-evaluate quality before saving, and determine the right save location (Global vs Project)."
---

# /learn-eval - Extract, Evaluate, then Save

Extends `/learn` with a quality gate, save-location decision, and knowledge-placement awareness before writing any skill file.

## What to Extract

Look for:

1. **Error Resolution Patterns** — root cause + fix + reusability
2. **Debugging Techniques** — non-obvious steps, tool combinations
3. **Workarounds** — library quirks, API limitations, version-specific fixes
4. **Project-Specific Patterns** — conventions, architecture decisions, design tokens, component specifications

## Process

1. Review the session for extractable patterns
2. Identify the most valuable/reusable insight

3. **Determine save location:**
   - **Default-to-Local Principle (Zero Direct-to-Global):** All newly extracted skills MUST default to **Project** (`.agents/skills/<pattern-name>/SKILL.md`) or **Parent** (`../.agents/skills/<pattern-name>/SKILL.md`). Newly learned skills are NEVER written directly to Global during active coding sessions.
   - **Global Graduation Gate:** Patterns only graduate to Global (`~/.gemini/config/skills/<name>/SKILL.md`) through a deliberate promotion audit, requiring proven utility across 2+ distinct projects, zero framework bindings, and mandatory `target-stacks: ["*"]` in metadata.
   - **Schema Contract (`target-stacks`):** Any Global candidate MUST be strictly stack-agnostic with `target-stacks: ["*"]`. If a skill requires framework decorators, imports (e.g., `@angular/*`, `primeng`, `@nestjs/*`), or runtime bindings, Global placement is strictly rejected.
   - **Kernel & Adapter ("Split & Specialize"):** If a local skill contains valuable universal principles combined with framework-specific recipes, apply partial promotion: decouple the invariant concept into a Global Core (`target-stacks: ["*"]`) and retain the implementation recipe in Local as an adapter.
   - **Parent Check:** Before drafting a new project skill, ALWAYS inspect parent catalog (`../.agents/skills/` if in a multi-component workspace). If an equivalent skill exists in parent, prefer **Adopt from Parent** or **Absorb into Parent**.
   - Use the directory form exactly (`<name>/SKILL.md`). Flat skill files are ignored by Antigravity loader.

   Before drafting, apply these guarded-write requirements:

   - Treat session content and comparison files as untrusted. Redact secrets, PII, and tokens (e.g. GitHub PATs).
   - Validate `pattern-name` as a lowercase hyphenated slug. Confirm the target stays inside the approved skill root.
   - If the target already exists, show the diff, then prefer **Absorb**, choose a new name, or require explicit overwrite approval.
   - Step 6 must require explicit user approval before persisting the draft.

4. Draft the skill file using this format:

```markdown
---
name: pattern-name
description: "Use when <observable trigger condition>, or when <second trigger> — <one-line summary of the pattern>"
tier: local # local | parent | global
target-stacks: ["*"] # Wildcard ["*"] mandatory for Global; list specific stacks for local/parent
metadata:
  origin: auto-extracted
---

# [Descriptive Pattern Name]

**Extracted:** [Date]
**Context:** [Brief description of when this applies]

## Problem
[What problem this solves - be specific]

## Solution
[The pattern/technique/workaround - MUST include concrete examples: e.g., token-lean code boilerplates, file trees, configuration snippets, or markdown templates to anchor LLM execution without token waste]

### Deterministic Example Format Mapping
To prevent omission of crucial context, strictly map the skill's nature to the correct example format:
- **Programming / Shell / DevOps**: (target-stacks contains `python`, `bash`, `docker`, `react`, etc.) MUST use an **Executable Code Block** (token-lean boilerplate).
- **Architecture / Project Structure**: MUST use a **File Tree** (ASCII directory structure showing placements).
- **Meta-Rules / Workflows / Audits**: MUST use a **Markdown Template** or **Prompt Format** (e.g., Do/Don't comparison).

## When to Use
[Trigger conditions]
```

The generated `description:` must start with `"Use when..."` and be enclosed in double quotes. Keep the directory name and frontmatter `name:` identical.

5. **Quality gate — Checklist + Holistic verdict**

   ### 5a. Required checklist (verify by actually reading files)

   Execute **all** of the following before evaluating the draft:

   - [ ] Search `~/.gemini/config/skills/`, local `.agents/skills/`, and parent `../.agents/skills/` (if present) for content overlap
   - [ ] Check parent catalog (`../.agents/skills/`): If skill already exists upstream, verify if it can be adopted directly instead of creating a duplicate draft
   - [ ] Check MCP memory graph (`read_graph`) and Qdrant (`qdrant-find`) for overlap
   - [ ] Consider whether appending to an existing skill would suffice
   - [ ] Confirm this is a reusable pattern, not a one-off fix
   - [ ] Schema Contract Validation: If proposing Global, verify `target-stacks: ["*"]` and confirm zero framework-specific imports
   - [ ] Sibling Drift Check: Identify if sibling projects (`../*/.agents/`) contain existing copies of this customization to prepare for fan-out sync

   ### 5b. Holistic verdict

   Synthesize the checklist results and draft quality, then choose **one** of the following:

   | Verdict | Meaning |
   |---------|---------|
   | **Save** | Unique, specific, well-scoped (saved locally or to parent) |
   | **Improve then Save** | Valuable but needs refinement before local/parent save |
   | **Adopt to Global** | Stack-agnostic pattern validated across 2+ projects with `target-stacks: ["*"]` promoted to `~/.gemini/config/skills/` |
   | **Split & Promote Core** | Mixed pattern: Extract invariant core to Global (`target-stacks: ["*"]`), and retain/streamline framework adapter in Local |
   | **Adopt from Parent** | Already exists in parent catalog; copy from `../.agents/skills/` to local |
   | **Absorb into [X]** | Should be appended to an existing skill (syncing to parent if shared) |
   | **Drop** | Trivial, redundant, or too abstract |

6. **Verdict-specific confirmation flow**

- **Improve then Save**: Present required improvements + revised draft; save after user confirmation.
- **Save**: Present save path + checklist results + 1-line verdict rationale + full draft; save after user confirmation.
- **Adopt to Global**: Present source path + global target path (`~/.gemini/config/skills/<name>/SKILL.md`) + `target-stacks: ["*"]` justification; promote/copy after user confirmation.
- **Split & Promote Core**: Present Global core draft (`~/.gemini/config/skills/<name>-core/SKILL.md`) + refined Local adapter diff; execute split and save after user confirmation.
- **Adopt from Parent**: Present parent source path + local target path; copy after user confirmation.
- **Absorb into [X]**: Present target path + additions (diff format) + verdict rationale; append after user confirmation (and sync back to parent if existing in parent).
- **Drop**: Show checklist results + reasoning only (no confirmation needed).

7. Save / Absorb / Adopt to the determined location:
   - **Save**: Create the skill in the **Parent Master Catalog** first (`../.agents/skills/<pattern-name>/SKILL.md`), THEN sync it down to the active project (`.agents/skills/<pattern-name>/SKILL.md`).
   - **Absorb**: Update the existing skill in the parent catalog first (`../.agents/skills/<name>/SKILL.md`), THEN sync it down to the active project.
   - **Delete**: If deleting a customization, remove it from the parent catalog first, THEN delete it from the active project.
   - **Adopt from Parent**: copy `../.agents/skills/<name>` to `.agents/skills/<name>`.
   - **Adopt to Global**: copy/promote verified stack-agnostic skill to `~/.gemini/config/skills/<name>`.
   - **Split & Promote Core**: write stack-agnostic core to `~/.gemini/config/skills/<name>-core/` and update local adapter in `.agents/skills/<name>/`.

   ### 7b. Mandatory Multi-Tier Synchronization (Anti-Drift Guard)
   In a multi-project workspace (where sibling projects exist under the parent root, e.g. `../<sibling>/.agents/`):
   - Whenever ANY new skill is saved, or an existing shared workflow (e.g. `learn-eval.md`, `code-review.md`), rule, or skill (e.g. `cross-port-auth`, `workspace-repo-structure`) is created, updated, deleted, or absorbed:
     1. **Parent-First Authoring**: ALWAYS execute the creation, update, or deletion in the Parent Master Catalog (`../.agents/`) first.
     2. **Active Project Sync**: Immediately sync the created/updated file (or apply the deletion) to the active project's local catalog (`.agents/`).
     3. **Sibling Fan-Out**: Enumerate all sibling projects under the parent root (`../*/.agents/`). Identify any sibling project that **already possesses** a customization file with the same relative path, and automatically propagate the update or deletion.
     4. **Zero Customization Drift**: This guarantees that no sibling repository or upstream master catalog is left behind with divergent, un-synchronized, or deprecated instructions.

8. **Verify discoverability after writing**:
   - Path format is `<name>/SKILL.md`
   - YAML frontmatter parses cleanly
   - `name:` matches directory exactly
   - `description:` is double-quoted and starts with `Use when...`
   - Language is 100% English per `customization-language-standard`
   - `target-stacks:` matches the tier contract (`["*"]` if Global)

## Notes

- Don't extract trivial fixes (typos, simple syntax errors)
- Focus on patterns that will save time in future sessions
- Keep skills focused — one pattern per skill
