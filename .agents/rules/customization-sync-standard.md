# Customization Synchronization Standard (Zero-Lag Sync)

Whenever any AI agent creates, edits, absorbs, or refactors a skill, rule, or workflow, the following three-tier synchronization protocol is **MANDATORY**:

## 1. Upstream Parent Master Catalog Sync
- In multi-component workspaces (monorepos with a parent `../.agents/`), any newly created or modified skill MUST immediately be copied/synced to `../.agents/skills/<name>/SKILL.md`.
- Never leave a sub-project skill updated while the Parent Master Catalog retains an outdated, missing, or divergent version.
- Parent catalog skills must always remain in a pristine, "Ready-to-Adopt" state.

## 2. Sibling Fan-Out Anti-Drift Propagation
- After updating or creating any customization:
  1. Enumerate all sibling sub-projects (`../*/.agents/skills/<name>/SKILL.md`, `../*/.agents/rules/`, `../*/.agents/workflows/`).
  2. For any sibling project that **already possesses** a customization file with the same relative path, automatically propagate the latest version.
  3. Ensure no sibling sub-project is left behind with drifted, divergent, or deprecated instructions.

## 3. Global Tier Promotion Sync
- If a newly extracted skill or rule qualifies for the Global Graduation Gate:
  - Proven utility across 2+ distinct projects.
  - 100% stack-agnostic with `target-stacks: ["*"]`.
  - Zero framework imports (`@angular/*`, `primeng`, `@nestjs/*`).
- Promote/copy to `~/.gemini/config/skills/<name>/SKILL.md` upon explicit user confirmation.

## Verification Checklist
Before completing any task touching customizations:
- [ ] Local file written: `.agents/skills/<name>/SKILL.md` (or rule/workflow).
- [ ] Parent catalog updated: `../.agents/skills/<name>/SKILL.md`.
- [ ] Sibling copies synchronized if present (`../*/.agents/...`).
- [ ] Run `python -X utf8 ../.agents/scripts/audit_customizations.py` to confirm zero drift and clean health score.
