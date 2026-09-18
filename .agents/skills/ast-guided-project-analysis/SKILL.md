---
name: ast-guided-project-analysis
description: "Use when you need to analyze project structure, find all implementations of a pattern, or map endpoints across a large codebase — write an AST script instead of looping grep/view_file."
tier: local
target-stacks: ["typescript", "node", "python", "javascript"]
metadata:
  origin: auto-extracted
---

# AST-Guided Project Analysis (Fast Discovery)

**Extracted:** 2026-09-17
**Context:** When the AI needs to understand the architecture, find all routes, map event listeners, or audit specific patterns across dozens or hundreds of files.

## Problem
Using `grep_search` followed by a loop of `view_file` calls to read source code is extremely slow, consumes a massive amount of LLM tokens, and easily hits context limits or rate limits. Text-based grep also misses structural context (e.g., failing to associate a `@Get` decorator with its parent class name).

## Solution
Instead of reading files sequentially through tools, write a quick, deterministic AST traversal script in the scratchpad and execute it to extract exactly the metadata you need in one pass.

### Executable Code Block (Example for TypeScript using Native Compiler API)

```typescript
// tmp/fast-analyze.ts
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// AI: Write a targeted recursive parser that prints only the facts needed.
// Example: Find all Controllers and their methods
function extract(node: ts.Node, sourceFile: ts.SourceFile) {
    if (ts.isClassDeclaration(node) && node.name) {
        console.log(`Class: ${node.name.text}`);
        node.members.forEach(member => {
            if (ts.isMethodDeclaration(member) && member.name) {
                console.log(`  Method: ${member.name.getText(sourceFile)}`);
            }
        });
    }
    ts.forEachChild(node, child => extract(child, sourceFile));
}

// Read file, parse, and print to stdout
const filePath = process.argv[2];
const sourceFile = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
extract(sourceFile, sourceFile);
```

Run this script across the target directories using a shell command or Node script. The AI can then read the single consolidated output file, completing a massive codebase audit in seconds with minimal token usage.

## When to Use
- When asked to "map all endpoints", "find all message consumers", or "list all database models".
- When `grep_search` returns too many files to reasonably open one by one.
- When you need to extract structural information (like decorators, class inheritance, or function arguments) across the entire monorepo quickly.
