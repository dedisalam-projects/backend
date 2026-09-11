---
name: jenkins-api-orchestration
description: "Use when managing, diagnosing, or triggering remote Jenkins pipelines via REST API, or when resolving Nx monorepo CI runner failures — authenticate with API tokens, query build state, stream console logs, and isolate monorepo project graphs"
tier: local
target-stacks: ["jenkins", "nx", "nestjs", "nodejs", "typescript"]
metadata:
  origin: auto-extracted
---

# Jenkins API Orchestration & Monorepo CI Stabilization

**Extracted:** 2026-09-11  
**Context:** Remote Jenkins server automation (behind Cloudflare / reverse proxies) and troubleshooting monorepo CI pipelines.

---

## Problem

1. **Remote Jenkins Interaction**: Interacting with a remote Jenkins instance without browser access requires secure API authentication, CSRF handling, build triggering, queue inspection, and log streaming.
2. **Windows PowerShell Alias Collision**: On Windows systems, PowerShell aliases `curl` to `Invoke-WebRequest`, causing commands with standard flags (e.g. `-u`, `-s`, `-X`) to fail with parameter ambiguity errors.
3. **Nx Project Graph Failures in CI**: Lingering untracked files or backup directories on the Jenkins runner workspace (e.g., deprecated `.eslintignore` after upgrading to flat config, or backed-up `node_modules_*` folders) cause `@nx/eslint/plugin` and project graph generators to scan thousands of extraneous `package.json` files and abort with `ProjectsWithNoNameError` or `NX Failed to process project graph`.
4. **Test Suite Scope Bleed**: When running unit tests with coverage (`npm run test:unit`), Jest traverses and executes integration, load, and soak test suites that expect live services (e.g., Socket.IO gateways or message brokers), leading to socket timeouts in headless environments.

---

## Solution

### 1. Remote Jenkins REST API Pattern

#### Authentication & PowerShell Safety
Always invoke `curl.exe` explicitly on Windows PowerShell to bypass the `Invoke-WebRequest` alias. Authenticate using HTTP Basic Authentication with your Jenkins Username and API Token:

```bash
# Verify credentials and identity
curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/whoAmI/api/json"
```

#### Inspecting Job and Build Status
```bash
# Query job metadata and last build number
curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/api/json"

# Check status of specific build
curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/<BUILD_NUMBER>/api/json"
```

#### Triggering Builds & Tracking Queue Items
1. Trigger the build via HTTP POST:
   ```bash
   curl.exe -X POST -i -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/build"
   ```
   *Response header `Location: <JENKINS_URL>/queue/item/<QUEUE_ID>/` indicates successful enqueueing.*

2. Track queue item to retrieve the assigned build number:
   ```bash
   curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/queue/item/<QUEUE_ID>/api/json"
   ```

3. Stream live console output:
   ```bash
   curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/<BUILD_NUMBER>/consoleText"
   ```

---

### 2. Nx Monorepo CI Runner Stabilization

#### Guarding Against Stale Workspace Artifacts
Add workspace purge steps in `Jenkinsfile` before running dependency installation or Nx commands:

```groovy
stage('Install Dependencies') {
    steps {
        echo 'Cleaning up existing locks and preparing clean workspace...'
        sh 'pkill -f "nx daemon" || true'
        sh 'rm -rf node_modules_* node_modules_del* || true'
        sh 'find . -name ".eslintignore" -delete || true'
        sh 'npm ci --legacy-peer-deps'
        sh 'npx nx reset'
    }
}
```

#### Excluding Backup Directories in `.nxignore`
Ensure Nx never parses lingering directories as projects:

```gitignore
# .nxignore
.stryker-tmp
reports
coverage
dist
node_modules_*
node_modules_del*
```

---

### 3. Unit Test Isolation & Dedicated Test Script Overrides

#### Strict Exclusion in Library Jest Config
Prevent unit test runners from accidentally running live socket/integration tests:

```typescript
// libs/common/jest.config.cts
module.exports = {
  // ...
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/test/', // Excludes live integration/load/e2e tests from unit test runs
  ],
};
```

#### Overriding in Dedicated CLI Scripts
When running specific integration or contract suites, override `testPathIgnorePatterns` directly via CLI:

```json
// package.json
{
  "scripts": {
    "test:unit": "nx run-many --target=test --all --coverage",
    "test:contract": "jest libs/common/src/test/contracts/event-contracts.spec.ts --testPathIgnorePatterns=node_modules",
    "test:integration": "jest libs/common/src/test/integration/realtime-e2e.integration.spec.ts --testPathIgnorePatterns=node_modules --runInBand --forceExit"
  }
}
```

---

## When to Use

- When authenticating, triggering, or streaming logs from a remote Jenkins server via terminal or automation agent.
- When `curl` fails with ambiguous parameter errors in PowerShell.
- When an Nx monorepo build fails with `NX Failed to process project graph` or `ProjectsWithNoNameError`.
- When CI unit tests fail due to integration or live server tests executing prematurely.
