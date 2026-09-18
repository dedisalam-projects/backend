---
name: obsidian-docs-refactoring
description: "Use when refactoring or writing project documentation, or when standardizing markdown files — enforce Obsidian Vault structures using YAML frontmatter, inline tags, and wiki-links."
tier: local
target-stacks: ["markdown", "obsidian"]
metadata:
  origin: auto-extracted
---

# Obsidian Docs Refactoring

**Extracted:** 2026-09-17
**Context:** When documentation files (like ENV.md, architecture docs, or API specs) lack structure and are difficult to query or search via Qdrant/MCP or IDE text search.

## Problem
Raw markdown files without metadata are difficult to filter. A full-text search often returns noisy results, making it hard to distinguish between an architecture overview, an API reference, or a setup guide.
Additionally, contextual markers (like tasks or status) often pollute YAML metadata when they should be localized to specific paragraphs.

## Solution
Refactor markdown documentation to function as an Obsidian Vault. Add structured YAML frontmatter for document-level classification, and use inline tags for contextual markers.

### Markdown Template
Whenever you create or refactor a documentation file, prepend this exact YAML frontmatter block:

```markdown
---
type: [architecture | api | guide | reference | config]
tags: 
  - [tag1]
  - [tag2]
aliases: ["Alternative Name 1", "Acronym"]
status: [draft | active | deprecated]
---

# Document Title
```

### Key Principles
1. **YAML Frontmatter**: Every file MUST start with the YAML metadata block.
2. **Tags**: Use specific, searchable tags (e.g., `tags: [backend, nestjs, microservice, auth]`).
3. **Internal Linking**: Use Obsidian-style double brackets for internal linking between docs (e.g., `See [[API_GATEWAY]] for details`) to build a knowledge graph.
4. **No Naked Docs**: Never leave a `.md` file in the `docs/` directory without YAML frontmatter.
5. **Inline Tags**: Use inline tags (`#tag-name`) directly in the markdown body for granular, contextual markers (e.g., `#todo`, `#refactor`, `#needs-review`). Reserve YAML tags purely for high-level document classification.

## When to Use
- When writing a new markdown file in the `docs/` folder.
- When asked to "refactor docs" or "make docs searchable".
- When consolidating API specifications or architecture overviews.
