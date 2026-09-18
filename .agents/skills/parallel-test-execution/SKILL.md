---
name: parallel-test-execution
description: "Use when running independent unit tests or mutation tests — allocate 3/4 of the total available PC cores to run tests in parallel."
tier: local
target-stacks: ["jest", "nx", "strykerjs", "nodejs", "bash"]
metadata:
  origin: auto-extracted
---

# Parallel Test Execution (Resource Allocation)

**Extracted:** 2026-09-17
**Context:** When running tests that are independent (unit tests or mutation tests), running them sequentially wastes time. However, using 100% of cores can freeze the OS, cause I/O bottlenecks, or result in flaky timeouts due to context switching.

## Problem
Single-threaded test execution (e.g., `concurrency: 1`) causes extremely slow feedback loops (e.g., 20+ minutes for mutation testing). Conversely, defaulting to `maxWorkers=100%` can crash the machine or cause OS unresponsiveness.

## Solution
Always run independent unit tests and mutation tests in parallel using **3/4 (75%) of the total CPU cores**. 

### Executable Code Block

**For Nx / Jest (CLI or `package.json`):**
Calculate 3/4 of the cores. (Example for an 8-core machine: `8 * 0.75 = 6`)
```bash
# Running unit tests via Nx with 3/4 cores
nx run-many --target=test --all --parallel=6
```

**For StrykerJS (`stryker.config.mjs`):**
Do not use `concurrency: 1`. Set it to 3/4 of the logical cores.
```javascript
export default {
  // ...
  concurrency: 6, // 3/4 of 8 total cores
};
```

**For Jest CLI (Standalone):**
```bash
jest --maxWorkers=75%
```

## When to Use
- When optimizing CI/CD pipelines or local test scripts.
- When running `nx test`, `nx run-many`, or `stryker run`.
- When encountering OS freezes during heavy test suites.
