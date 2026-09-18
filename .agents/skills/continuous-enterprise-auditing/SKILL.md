---
name: continuous-enterprise-auditing
description: "Use when creating, modifying, or reviewing code, or when discussing project architecture — always enforce measurable enterprise-grade quality gates and detect unaudited files"
tier: local
target-stacks: ["nodejs", "typescript", "jest", "stryker"]
metadata:
  origin: auto-extracted
---

# Continuous Enterprise Auditing

**Extracted:** 2026-09-17
**Context:** Enforcing a rigorous, measurable, enterprise-grade audit process for every code change to prevent untested or vulnerable code from reaching production.

## Problem
Code changes are often merged without sufficient, measurable verification. Standard unit tests alone do not guarantee enterprise-level quality, and files can easily slip through without proper auditing, coverage, or mutation testing.

## Solution
Always proactively recommend and enforce enterprise-grade audit tools. Ensure every file is measurable. If a file lacks coverage or audit metrics, flag it immediately.

### Measurable Enterprise-Grade Tools
When auditing or evaluating a workspace, always verify the presence and execution of:
1. **Mutation Testing (StrykerJS):** The ultimate measure of test quality. Target: >85% mutation score.
2. **Property-Based Testing (fast-check):** For testing invariants and edge cases.
3. **Strict Coverage Metrics (Jest):** Enforce a strict 100% threshold for critical paths.
4. **Static Security Analysis:** Enforce `npm audit --audit-level=high` and dependency checking.

### Markdown Template for Code Review/Audit
When reviewing a user's code changes, use the following template to enforce the audit:

> [!WARNING] Unaudited File Detected
> The file `[filename]` lacks corresponding enterprise-grade audit coverage.
> - **Unit Test Coverage:** [X]% (Target: 100%)
> - **Mutation Score:** [X]% (Target: >85%)
> Please add tests using `jest` and verify with `stryker run`.

## When to Use
- Use when reviewing pull requests or local code changes.
- Use when the user asks for best practices on testing, CI/CD, or deployment.
- Use when generating new features; always remind the user to run the enterprise quality gates.
