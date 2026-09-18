---
name: ast-guided-code-modification
description: "Use when performing complex structural code modifications, refactoring multiple files, or updating decorators — write a deterministic AST script to modify code safely."
tier: local
target-stacks: ["typescript", "node", "python", "javascript"]
metadata:
  origin: auto-extracted
---

# AST-Guided Code Modification

**Extracted:** 2026-09-17
**Context:** When the AI needs to perform complex codebase refactoring, such as mass-renaming methods, updating decorators across multiple files, or injecting imports securely.

## Problem
Relying on direct text manipulation (`replace_file_content`) or LLM code regeneration for large files is brittle. It often leads to truncated outputs, syntax errors due to indentation mismatches, or broken imports, especially in complex frameworks like NestJS or Angular.

## Solution
Instead of attempting text-based replacements for complex logic, write and execute a deterministic AST manipulation script in the scratchpad. Let the script traverse the Abstract Syntax Tree, safely apply the structural changes, and overwrite the files.

For TypeScript/JavaScript, utilize tools like `ts-morph` (if available) or the raw `typescript` compiler API.
For Python, utilize the built-in `ast` module.

### Executable Code Block (Example for TypeScript using `ts-morph`)

```typescript
// scratch/refactor-script.ts
import { Project } from "ts-morph";

// 1. Initialize Project and add target files
const project = new Project();
project.addSourceFilesAtPaths("apps/**/*.ts");

// 2. Query and Manipulate AST safely
const files = project.getSourceFiles();
for (const file of files) {
  const classes = file.getClasses();
  for (const cls of classes) {
    if (cls.getName()?.endsWith('Controller')) {
      // Example: Inject a new decorator safely without breaking existing syntax
      if (!cls.getDecorator('ApiTags')) {
        cls.addDecorator({
          name: 'ApiTags',
          arguments: [`'${cls.getName()}'`]
        });
      }
    }
  }
}

// 3. Save all changes synchronously
project.saveSync();
```

## When to Use
- Whenever the user asks for a project-wide refactor, renaming, or structural pattern update.
- When injecting new fields, decorators, or imports into numerous existing classes/functions.
- When traditional find-and-replace risks breaking syntax or matching unintended code comments.
