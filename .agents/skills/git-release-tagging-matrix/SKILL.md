---
name: git-release-tagging-matrix
description: "Use when deciding whether to tag a repository, determining Semantic Versioning increments, or executing release tags across microservices and monorepos."
tier: local
target-stacks: ["git", "ci-cd", "*"]
metadata:
  origin: auto-extracted
---

# Git Release Tagging Strategy & Decision Matrix

**Extracted:** 2026-09-11
**Context:** Guidelines and quality gates for creating, publishing, and managing annotated Git release tags across microservices and fullstack repositories.

## Problem
Developers often either over-tag repositories (creating tags for minor chore commits) or under-tag them (deploying untagged commit SHAs or `:latest` Docker containers to production). Without a structured tagging matrix:
1. Rollbacks during outages are slow and error-prone because deployment commits are unanchored.
2. CI/CD pipelines cannot reliably trigger production-scoped build and publish stages.
3. Teams lack immutable historical baselines to benchmark test coverage, regressions, or architectural rewrites.

## Solution

### 1. Tagging Trigger Decision Matrix

| Condition | Release Type | SemVer Increment | Action |
|---|:---:|:---:|---|
| Breaking architecture rewrite, API protocol change, zero-REST shift, or incompatible DB migration | Major | `v(X+1).0.0` (e.g. `v1.0.0`, `v2.0.0`) | Merge to default branch, verify 100% test gate, create annotated tag, push to remote. |
| New backward-compatible feature, new domain namespace, or non-breaking microservice capability | Minor | `vX.(Y+1).0` (e.g. `v1.1.0`) | Merge feature PR, run contract verification, tag and push. |
| Critical bug fix, security patch, or performance hotfix without interface changes | Patch | `vX.Y.(Z+1)` (e.g. `v1.0.1`) | Cherry-pick or merge fix, verify regressions, tag and push. |
| Pre-release QA, staging verification, or beta customer feedback | Pre-Release | `vX.Y.Z-rc.N` (e.g. `v1.0.0-rc.1`) | Tag directly on release candidate branch to trigger staging deployment. |

### 2. Mandatory Pre-Tagging Clearance Checklist
Before creating any release tag, verify that ALL of the following criteria are met:
- [ ] Working tree is clean (`git status` reports `nothing to commit, working tree clean`).
- [ ] Code is merged into the protected primary branch (`master` or `main`).
- [ ] All unit, integration, property-based, and contract tests pass 100%.
- [ ] CI/CD pipeline and pre-push hooks execute without errors.
- [ ] Conventional Commit history is tidy and free of WIP commits.

### 3. Execution Standard: Annotated Tags Only
NEVER use lightweight tags (`git tag v1.0.0`). Always create **Annotated Tags** (`-a`) to record tagger identity, timestamp, and a structured release summary:

```bash
# 1. Ensure primary branch is up to date
git checkout master
git pull origin master

# 2. Create annotated release tag
git tag -a v1.0.0 -m "release(backend): pure realtime socket.io architecture with 100% testing matrix, security hardening, and jenkins pipeline"

# 3. Push tag to remote
git push origin v1.0.0
```

### 4. CI/CD Pipeline Automation Pattern
Use Git tags to gate production image publishing and infrastructure deployments:

```groovy
// Jenkinsfile Pipeline Example
stage('Docker Build & Push on Release Tag') {
    when {
        buildingTag()
    }
    steps {
        sh "docker build -t registry/app:${TAG_NAME} ."
        sh "docker push registry/app:${TAG_NAME}"
    }
}
```

## When to Use
- When concluding an architectural milestone or significant feature epic.
- When preparing an artifact for staging, QA, or production deployment.
- When hotfixing a production vulnerability or bug.
- When deciding whether a session's changes justify a SemVer bump.
