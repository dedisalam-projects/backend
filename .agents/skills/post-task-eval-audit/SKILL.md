---
name: post-task-eval-audit
description: "Use when completing any task, feature, bug fix, or refactor — evaluate AI execution with an auditor scorecard, extract reusable patterns via /learn-eval, and formulate continuous improvement feedback"
tier: local
target-stacks: ["*"]
metadata:
  origin: auto-extracted
---

# Post-Task Evaluation & Auditor Review Protocol

**Extracted:** 2026-09-10
**Context:** Executed at the conclusion of every job, implementation, or refactoring task to ensure high standards of quality, extract reusable learnings, and provide transparent auditor scoring.

## Problem
AI agents frequently complete tasks and hand off work without systematically reflecting on execution quality, identifying friction points, or capturing non-obvious workarounds. This results in repeated inefficiencies on similar subsequent tasks, undocumented conventions, and a lack of objective accountability for code quality, rule compliance, and token usage.

## Solution
At the conclusion of each completed task (after code verification and before session conclusion), execute this 3-step evaluation protocol:

### 1. Document Concrete Steps Taken
Provide a crisp, chronological summary of all actions executed during the session:
- Discovery, architecture research, and file inspections.
- Plan creation, user alignment, and decision forks.
- Code modifications, migrations, and dependency updates.
- Automated tests, builds, and verification loops run.

### 2. Produce the Auditor Scorecard (0 - 100 Scale)
Evaluate the AI's execution objectively across 5 core pillars:

| Pillar | Max Score | Evaluation Criteria |
| :--- | :---: | :--- |
| **Architecture & Rule Compliance** | 25 | Adherence to workspace rules, 9-folder structure, zero root pollution, tier placement boundaries |
| **Code Quality & Typing Standards** | 20 | Strict type safety (no `any`), immutability, proper error handling, 100% English in config/skills |
| **Execution & Token Efficiency** | 20 | Direct tool calls, zero redundant polling, minimal retry churn, lean prompt/output ratio |
| **Verification & Testing Rigor** | 20 | Automated tests executed, build/lint checks verified green, regressions checked |
| **Hygiene & Anti-Pollution** | 15 | Scratch scripts cleaned up, no leaked secrets or sensitive tokens, memory graph kept clean |

#### Rating Scale
- **95 - 100**: **Grade A+ (Pristine)** — Flawless execution, zero regressions, optimal token efficiency.
- **85 - 94**: **Grade A (Excellent)** — High quality output, minor non-blocking friction or 1 minor retry.
- **75 - 84**: **Grade B (Satisfactory)** — Meets core requirements, but notable token waste or missing edge case checks.
- **60 - 74**: **Grade C (Needs Improvement)** — Multiple retries, unoptimized edits, or weak test coverage.
- **< 60**: **Grade F (Unacceptable)** — Broken builds, architectural violations, or uncaught regressions.

### 3. Continuous Improvement Critique & Pattern Extraction
1. **Auditor Reflection**:
   - **Strengths**: What worked cleanly and efficiently.
   - **Bottlenecks**: Where token waste, retries, or ambiguity occurred.
2. **Trigger `/learn-eval`**:
   - Identify extractable patterns: error resolutions, non-obvious debugging techniques, library workarounds, or project conventions.
   - Apply Default-to-Local Principle (`.agents/skills/` or `../.agents/skills/`).
   - If worthy, draft and propose the skill to make similar future work faster.
3. **Trigger `post-task-memory-sync`**:
   - Prune obsolete entities and synchronize updated state to Knowledge Graph and Qdrant vector store.

## Output Format Template

Every completed task must conclude with this formatted section:

```markdown
### 📋 Post-Task Auditor Evaluation Report

#### 1. Steps Taken (Langkah yang Diambil)
- [Step 1...]
- [Step 2...]

#### 2. Auditor Scorecard
- **Total Score**: `XX / 100` | **Grade**: `[A+ / A / B / C / F]`
- **Pillar Breakdown**:
  - Architecture & Rules: `X / 25` — [Reasoning]
  - Code Quality & Typing: `X / 20` — [Reasoning]
  - Execution Efficiency: `X / 20` — [Reasoning]
  - Verification & Testing: `X / 20` — [Reasoning]
  - Hygiene & Anti-Pollution: `X / 15` — [Reasoning]

#### 3. Continuous Improvement Feedback
- **Strengths**: [What was optimal]
- **Bottlenecks Identified**: [Where friction occurred]
- **Actionable Takeaway**: [Specific guideline to accelerate similar future tasks]
```

## When to Use
- Immediately upon completing any user feature request, bug fix, or refactor.
- Prior to declaring a task finished and handing back control to the user.
- Whenever running the post-task completion sequence.
