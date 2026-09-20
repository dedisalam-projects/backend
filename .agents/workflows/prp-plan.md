---
description: Create comprehensive feature implementation plan with codebase analysis and pattern extraction
argument-hint: <feature description | path/to/prd.md>
---

> Adapted from PRPs-agentic-eng by Wirasm. Part of the PRP workflow series.

# PRP Plan

Create a detailed, self-contained implementation plan capturing all codebase patterns, conventions, and context needed to implement a feature in a single pass.

**Core Philosophy**: A great plan contains everything needed to implement without asking further questions.
**Golden Rule**: If you would need to search the codebase during implementation, capture that knowledge NOW in the plan.

---

## Phase 0 — DETECT

Determine input type from `$ARGUMENTS`:

| Input Pattern | Detection | Action |
|---|---|---|
| Path ending in `.prd.md` | File path to PRD | Parse PRD, find next pending phase |
| Path to `.md` with "Implementation Phases" | PRD-like document | Parse phases, find next pending |
| Path to any other file | Reference file | Read file for context, treat as free-form |
| Free-form text | Feature description | Proceed directly to Phase 1 |
| Empty / blank | No input | Ask user what feature to plan |

### PRD Parsing (when input is a PRD)
1. Read the PRD file with `cat "$PRD_PATH"`
2. Parse **Implementation Phases**; find next eligible `pending` phase (check dependencies on completed phases)
3. Extract: phase name, description, acceptance criteria, dependencies, constraints
4. Use description as feature to plan (report if all phases are already complete)

---

## Phase 1 — PARSE

Extract and clarify the feature requirements:
- **What**: Concrete deliverable
- **Why**: User value
- **Who**: Target user or system
- **Where**: Affected codebase area

### User Story & Complexity
Format: `As a [user], I want [capability], So that [benefit].`

| Level | Indicators | Typical Scope |
|---|---|---|
| **Small** | Single file, isolated change, no new dependencies | 1-3 files, <100 lines |
| **Medium** | Multiple files, follows existing patterns | 3-10 files, 100-500 lines |
| **Large** | Cross-cutting concerns, new patterns, external integrations | 10+ files, 500+ lines |
| **XL** | Architectural changes, new subsystems | 20+ files (consider splitting) |

### Ambiguity Gate
**STOP and ask the user** if: core deliverable is vague, success criteria are undefined, multiple interpretations exist, or technical approach has major unknowns. Never guess.

---

## Phase 2 — EXPLORE

Search the codebase directly for 8 intelligence categories:
1. **Similar Implementations**: Existing features, endpoints, components, or modules with analogous patterns.
2. **Naming Conventions**: File, function, variable, class, and export casing in the target area.
3. **Error Handling**: How errors are caught, propagated, logged, and returned.
4. **Logging Patterns**: Log levels, formats, and event contexts.
5. **Type Definitions**: Interfaces, types, DTOs, schemas, and organization.
6. **Test Patterns**: Test locations, naming (`*.spec.ts`, `*_test.go`), setup/teardown, assertions.
7. **Configuration**: Config files, environment variables, feature flags.
8. **Dependencies**: Packages, imports, and internal modules used by similar features.

### Codebase Analysis (5 Traces)
Read files to trace: **Entry Points**, **Data Flow**, **State Changes**, **Contracts** (APIs/interfaces), and **Architectural Patterns** (repository, service, controller).

### Unified Discovery Table
| Category | File:Lines | Pattern | Key Snippet |
|---|---|---|---|
| Naming | `src/services/userService.ts:1-5` | camelCase services | `export class UserService` |
| Error | `src/middleware/errorHandler.ts:10-25` | Custom AppError | `throw new AppError(...)` |

---

## Phase 3 — RESEARCH

If using external libraries/APIs or unfamiliar tech, search docs and best practices.
Format findings as:
```
KEY_INSIGHT: [what was learned]
APPLIES_TO: [affected plan section]
GOTCHA: [known warnings / version pitfalls]
```
If internal patterns suffice, record: *"No external research needed — established internal patterns."*

---

## Phase 4 — DESIGN

### UX Transformation (if applicable)
Document before/after flow:
- **Before**: `[Current user flow / UI state]`
- **After**: `[Improved user flow / UI state]`
- **Interaction Changes**: Table of touchpoints, before, after, and notes.
*(For purely backend/internal features: note "Internal change — no user-facing UX transformation".)*

---

## Phase 5 — ARCHITECT

Define strategic implementation boundaries:
- **Approach**: High-level strategy (e.g., "Add new service layer following existing repository pattern")
- **Alternatives Considered**: Evaluated approaches and why they were rejected
- **Scope**: Concrete boundaries of what WILL be built
- **NOT Building**: Explicit out-of-scope list to prevent scope creep

---

## Phase 6 — GENERATE

Save full plan to `.claude/PRPs/plans/{kebab-case-feature-name}.plan.md`. Create directory: `mkdir -p .claude/PRPs/plans`.

### Plan Template

````markdown
# Plan: [Feature Name]

## Summary
[2-3 sentence overview]

## User Story & Metadata
- **Story**: As a [user], I want [capability], so that [benefit].
- **Problem → Solution**: [Current state] → [Desired state]
- **Complexity**: [Small | Medium | Large | XL] | **Estimated Files**: [count]
- **Source PRD / Phase**: [path / phase name or "N/A"]

## UX Design & Interactions
- **Before / After**: [Flow diagram or "N/A — internal change"]
- **Interaction Table**: Touchpoint | Before | After | Notes

## Mandatory Reading & External Docs
| Priority | File:Lines | Why |
|---|---|---|
| P0 (critical) | `path/to/file:1-50` | Core pattern to follow |
| P1 (important) | `path/to/types:10-30` | Related types/contracts |

## Patterns to Mirror
- **NAMING_CONVENTION**: `// SOURCE: file:lines` -> `[code snippet]`
- **ERROR_HANDLING**: `// SOURCE: file:lines` -> `[code snippet]`
- **LOGGING_PATTERN**: `// SOURCE: file:lines` -> `[code snippet]`
- **DATA_ACCESS / SERVICE**: `// SOURCE: file:lines` -> `[code snippet]`
- **TEST_STRUCTURE**: `// SOURCE: file:lines` -> `[code snippet]`

## Files to Change & Scope Boundaries
| File | Action | Justification |
|---|---|---|
| `path/to/new.ts` | CREATE | New service |
| `path/to/existing.ts` | UPDATE | Extend method |

**NOT Building (Out of Scope)**:
- [Item 1 out of scope]
- [Item 2 out of scope]

## Step-by-Step Tasks
### Task 1: [Name]
- **ACTION**: [What to do]
- **IMPLEMENT**: [Specific code/logic to write]
- **MIRROR**: [Discovered pattern to follow]
- **IMPORTS**: [Required imports]
- **GOTCHA**: [Known pitfall to avoid]
- **VALIDATE**: [Verification command/step]

### Task 2+: [Continue format for all remaining tasks...]

## Testing Strategy & Validation
### Unit Tests & Edge Cases
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
- Checklist: [ ] Empty input [ ] Max input [ ] Invalid types [ ] Concurrency [ ] Failures [ ] Auth

### Validation Commands
```bash
# Static check & tests:
[project-specific type check command]      # EXPECT: Zero type errors
[project-specific unit test command]       # EXPECT: All unit tests pass
[project-specific full test suite command] # EXPECT: No regressions
```

## Acceptance Criteria & Completion Checklist
- [ ] All tasks completed & validation commands pass
- [ ] Code strictly follows mirrored conventions (naming, error handling, logging)
- [ ] No hardcoded values; no unauthorized scope additions
- [ ] Self-contained — zero questions needed during implementation
````

---

## Phase 7 — OUTPUT & NEXT STEPS

### Save & Update
1. Write plan to `.claude/PRPs/plans/{kebab-case-feature-name}.plan.md`
2. If sourced from a PRD, set phase status to `in-progress` and reference the plan path

### Report to User
```markdown
## Plan Created
- **File**: .claude/PRPs/plans/{kebab-case-feature-name}.plan.md
- **Source / Phase**: [PRD path / phase name]
- **Complexity & Scope**: [level, N files, M tasks]
- **Key Patterns**: [top 3 discovered patterns]
- **Confidence**: [1-10] (likelihood of single-pass implementation)

> Next: Run `/prp-implement .claude/PRPs/plans/{name}.plan.md` to execute.
```

### Pre-Finalization Verification Checklist
- [ ] **Context Completeness**: Files, naming conventions, errors, tests, and dependencies captured
- [ ] **Task Readiness**: Every task has ACTION, IMPLEMENT, MIRROR, and VALIDATE
- [ ] **Pattern Faithfulness**: Code snippets reference real files and line numbers
- [ ] **Self-Contained Test**: A new developer can implement this with zero codebase searching
