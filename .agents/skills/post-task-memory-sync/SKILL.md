---
name: post-task-memory-sync
description: "Use when completing a task, closing a bug, finishing a feature, or concluding a pair-programming milestone — prune obsolete knowledge and synchronize key decisions to MCP memory and Qdrant vector store"
tier: local
target-stacks: ["*"]
metadata:
  origin: auto-extracted
---

# Post-Task Memory & Qdrant Sync (Hygiene & Retention)

**Extracted:** 2026-09-11
**Context:** Executed at the conclusion of every task or milestone to maintain persistent knowledge retention and prevent knowledge pollution across MCP `memory` (Knowledge Graph) and `qdrant` (Vector Store).

## Problem
After completing an implementation, refactor, or bug fix, outdated observations and obsolete entities can pollute the persistent knowledge graph, while new architectural decisions risk being lost across conversation sessions if not explicitly persisted. Furthermore, calling lazy-loaded memory MCP tools with guessed parameter names (e.g. `type` instead of `entityType`) causes schema rejection errors.

## Solution
At the conclusion of each completed task, execute a 3-phase cycle: **Prune Obsolete -> Sync Graph -> Sync Vector**:

### 1. Knowledge Anti-Pollution & Hygiene
Before adding new data, evaluate and purge invalid, outdated, or superseded information:
- **`delete_observations`**: Remove obsolete observations or facts from surviving entities.
  ```json
  {
    "deletions": [
      {
        "entityName": "MCP_Workspace_Config",
        "observations": ["Configured servers: github-mcp"]
      }
    ]
  }
  ```
- **`delete_entities`**: Remove entities representing components, modules, or configurations that have been deprecated, renamed, or deleted (`entityNames: ["OldComponent"]`).
- **`delete_relations`**: Sever broken or obsolete dependency relations (`relations: [{ "from": "...", "to": "...", "relationType": "..." }]`).

### 2. Synchronize to MCP `memory` (Knowledge Graph)
Store verified new entities and active relations using `memory` tools:
- **`create_entities`**: Register modified or newly introduced architecture entities, configuration files, and core components.

> [!CAUTION]
> **Strict Zod Schema Enforcement for `create_entities`**:
> The property name for entity type MUST be `entityType` (NOT `type`, NOT `category`). Passing `type` will cause an immediate MCP schema validation rejection (`Invalid input: expected string, received undefined at entities[0].entityType`).
> Schema format:
```json
{
  "entities": [
    {
      "name": "ModuleName",
      "entityType": "Configuration",
      "observations": [
        "Key decisions, file paths, and active conventions"
      ]
    }
  ]
}
```

- **`create_relations`**: Connect dependencies between entities.
- **`add_observations`**: Append state updates if the entity already exists in the graph.

### 3. Synchronize to MCP `qdrant` (Semantic Vector Store)
Store a concise summary of the final state of truth in the project vector collection via `qdrant-store`:
- Ensure stored information is clean, condensed, and free of raw conversation transcripts, temporary debug logs, or scratch paths.
- Structure payload with context:
  - `task_summary`: High-level summary of accomplished work.
  - `key_changes`: Key modified files and their architectural purpose.
  - `context_tags`: Relevant searchable tags.
