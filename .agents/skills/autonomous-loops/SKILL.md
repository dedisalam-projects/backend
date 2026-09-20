---
name: autonomous-loops
description: "Use when needing to pattern and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems. Retained for compatibility only: when new autonomous loop guidance is needed, use continuous-agent-loop instead."
metadata:
  origin: ECC
---

# Autonomous Loops Skill

> Compatibility Note: `autonomous-loops` is retained for backwards compatibility. For new autonomous loop guidance, use `continuous-agent-loop`.

Architectures and reference patterns for running autonomous agent loops — from simple sequential pipelines to RFC-driven multi-agent DAG orchestration.

## When to Use

- Configuring autonomous development pipelines that run unattended
- Choosing between sequential, PR-driven, and multi-agent DAG architectures
- Establishing state persistence across independent iteration contexts
- Integrating cleanup ("de-sloppify") and automated quality gates into agent runs

---

## Architecture Spectrum

| Pattern | Complexity | Best For | Key Mechanism |
|---|---|---|---|
| **Sequential Pipeline** | Low | Scripted task sequences, migrations | Chained `claude -p` commands with `set -e` |
| **NanoClaw REPL** | Low | Interactive persistent sessions | Markdown-as-database conversation log |
| **Continuous PR Loop** | Medium | Iterative development with CI gates | Branch -> Edit -> PR -> Wait CI -> Auto-merge |
| **De-Sloppify Pass** | Add-on | Post-implementation cleanup | Dedicated pass removing speculative code/tests |
| **RFC-Driven DAG** | High | Large multi-unit parallel feature work | Worktree isolation + merge queue with eviction |

---

## 1. Sequential Pipeline (`claude -p`)

The simplest and most resilient loop. Chains single-purpose agent invocations where each step has a clean context window:

```bash
#!/usr/bin/env bash
set -e

# Step 1: Implementation under TDD
claude -p "Implement the requested feature per docs/spec.md. Write failing tests first. Keep changes minimal."

# Step 2: De-sloppify cleanup pass
claude -p "Review modified files. Remove unnecessary framework mocks, defensive type assertions, and dead code. Ensure test suite passes."

# Step 3: Verification & Quality Gate
claude -p "Run build, typecheck, and full test suite. Fix any regressions before concluding."

# Step 4: Atomic Commit
claude -p "Stage changes and create a conventional commit describing the verified work."
```

**Key Principles:**
- **Fresh Context**: Context resets per step eliminate token degradation and hallucinations.
- **Model Routing**: Route heavy planning to Opus (`--model opus`) and fast implementation to Sonnet/Haiku.
- **Fail-Fast**: Stop execution immediately on unexpected test or build errors (`set -e`).

---

## 2. Continuous PR Loop & State Persistence

For long-running tasks spanning multiple hours or commits, persist cross-iteration state via a structured markdown journal (`SHARED_TASK_NOTES.md`):

```markdown
# Shared Task Journal
## Completed Items
- [x] Implemented core schema migration (Pass 1)
- [x] Added service endpoints with validation tests (Pass 2)
## Next Steps
- [ ] Add rate limiter middleware to public route
- [ ] Update integration suite fixtures
```

### Automation Lifecycle:
1. **Branch Checkout**: `git checkout -b task/iteration-$N`
2. **Context Intake**: Read `SHARED_TASK_NOTES.md`
3. **Execution**: Apply changes, run local test suite
4. **CI Wait & Auto-Fix**: Push PR, monitor CI checks; on failure, inject failure output into a fix prompt
5. **State Update**: Check off completed items in `SHARED_TASK_NOTES.md` and squash-merge

---

## 3. The "De-Sloppify" Cleanup Pattern

LLMs instructed to write comprehensive tests often generate low-value "slop":
- Assertions testing language/compiler mechanics (e.g. `expect(typeof x === 'string')`)
- Redundant mocks for core runtime primitives
- Speculative abstractions not required by the active spec

> **Insight**: Rather than adding negative instructions ("do not write excessive tests") which make models hesitant, run a dedicated de-sloppify cleanup pass immediately after implementation.

```bash
claude -p "Review uncommitted git changes. Remove tautological tests and dead code. Confirm tests still pass."
```

---

## 4. RFC-Driven Multi-Agent DAG (Ralphinho Pattern)

For large systems requiring parallel agents without merge disasters:

1. **Decomposition**: Break spec into self-contained `WorkUnit` items with explicit dependency edges (`deps: []`).
2. **Worktree Isolation**: Each unit executes in an isolated git worktree (`/tmp/wt-<unit-id>`).
3. **Tiered Scrutiny**:
   - `trivial`: implement -> test
   - `medium`: plan -> implement -> test -> review
   - `large`: research -> plan -> implement -> test -> dual-review -> gate
4. **Merge Queue & Eviction**: Units land sequentially into `main`. If merge conflicts or test failures occur during rebase, the unit is **evicted**, given the conflict diff, and rescheduled.

---

## Decision Matrix

```
Is the task a single focused unit?
├── Yes -> Sequential Pipeline (`claude -p`)
└── No  -> Is there a written spec/RFC?
           ├── Yes -> Require parallel execution?
           │          ├── Yes -> RFC-Driven DAG (Worktrees + Merge Queue)
           │          └── No  -> Continuous PR Loop (Shared Notes + CI gates)
           └── No  -> Break into atomic units with /plan first
```

---

## Anti-Patterns & Safety

| Anti-Pattern | Failure Mode | Prevention |
|---|---|---|
| **Unbounded Loops** | Infinite runaway cost / token drain | Always set `--max-runs`, `--max-cost`, or hard timeout |
| **Silent Retries** | Repeating identical failing attempts | Capture stacktrace/diff and feed error context into next run |
| **All-in-One Context** | Memory bleed and reviewer bias | Separate implementer and reviewer into distinct processes |
| **Blind Concurrency** | Catastrophic merge conflicts | Isolate branches in worktrees with a designated merge queue |

> [!IMPORTANT]
> **Rule Adherence**: Always strictly follow the `autonomous-loops` conventions outlined above to ensure workspace consistency and prevent regressions.
