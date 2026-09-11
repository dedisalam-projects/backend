---
name: workspace-repo-structure
description: "Use when running git commands, executing terminal operations, creating files, or interacting with frontend, backend, or infrastructure repositories in this workspace — strictly enforce zero root pollution and 9-folder root structure."
metadata:
  origin: auto-extracted
---

# Workspace Repository Structure & Cleanliness

**Extracted:** 2026-09-05 (Updated: 2026-09-10)
**Context:** The workspace `d:\dedisalam\fullstack` is not managed as a single monolithic Git repository; it houses multiple independent components. Agents must verify their current working directory before executing CLI commands, creating files, or invoking MCP tools.

## Allowed Root Structure (Strict 9-Folder Rule)
At the root of the workspace `d:\dedisalam\fullstack`, **ONLY** the following 9 directories are permitted:
1. `.agents` — Agent configurations, rules, skills, workflows, and process orchestration (`.agents/ecosystem.config.js`).
2. `AI` — Artificial intelligence components and model assets.
3. `backend` — Backend microservices (NestJS, API Gateway, User Service, Notification Service).
4. `frontend` — Legacy/alternative frontend project.
5. `frontend-web` — Angular micro-frontends (Dashboard :4000, Landing :4001, Auth :4002).
6. `frontend-android` — Android frontend mobile application.
7. `frontend-windows` — Windows desktop application (WinUI 3).
8. `design-ui-ux` — UI/UX design assets, wireframes, mockups, design system, and interface prototypes.
9. `infrastructure` — DevOps, cloud orchestration, database schemas/init, reverse proxy (Nginx), message brokers, and monitoring configurations.

## Zero Root Pollution Guidelines
Every AI agent **must** strictly comply with root hygiene rules:
1. **Never Run `npm install` at Root**: Each sub-project (`backend`, `frontend-web`) maintains its own isolated `package.json` and dependencies. Never initialize or create a `package.json` or `node_modules` at the workspace root.
2. **Never Create Scratch Scripts at Root**: Temporary diagnostic, seed, or migration scripts must reside inside the internal scratch directory (`brain/<id>/scratch/`) and be deleted immediately after execution.
3. **Never Save Screenshots or Media at Root**: Playwright screenshots or media artifacts must be directed to `.agents/artifacts/screenshots/`, `design-ui-ux/`, or the respective sub-project assets directory.
4. **PM2 Runner Orchestration**: Multi-app PM2 runtime configurations reside in `.agents/ecosystem.config.js`. Launch via `npx pm2 start .agents/ecosystem.config.js` or `npx pm2 restart <appName>`.

## Multi-Repo Git Operations
Understand the repository structure for this project:

1. **Frontend**
   - Local Path: `d:\dedisalam\fullstack\frontend`
   - GitHub Target: `owner: dedisalam-projects`, `repo: frontend`

2. **Backend**
   - Local Path: `d:\dedisalam\fullstack\backend`
   - GitHub Target: `owner: dedisalam-projects`, `repo: backend`

3. **Infrastructure**
   - Local Path: `d:\dedisalam\fullstack\infrastructure`
   - DevOps Target: `owner: dedisalam-projects`, `repo: infrastructure`

## When to Use
- When calling GitHub MCP tools (e.g. `update_issue`, `search_issues`), ensure the `repo` parameter matches the correct target repository.
- Before executing `git add`, `git commit`, or `git push`, always verify that the command executes in the correct sub-repository working directory.
- Before creating new scripts or test files, ensure they are placed within the relevant sub-project directory, never at the root.
