---
name: ast-guided-docs-generation
description: "Use when generating or updating documentation for the Obsidian vault — ensure zero omissions by using a deterministic AST extraction script as an intermediate reference step before writing."
tier: local
target-stacks: ["nx", "obsidian", "python", "typescript"]
metadata:
  origin: auto-extracted
---

# AST-Guided Documentation Generation

**Extracted:** 2026-09-17
**Context:** When the AI is tasked with writing or updating documentation for the project's Obsidian Vault (in the `docs/` folder) and must guarantee 100% structural coverage without missing any functions, classes, or parameters.

## Problem
Relying solely on LLM context windows to read source files often results in hallucinated signatures, skipped internal methods, or incomplete parameter lists. This leads to drift and inaccuracies in the Obsidian documentation.

## Solution
Before generating the final markdown documentation, the AI MUST write and execute a temporary, deterministic script (e.g., using Python's `ast` module for Python files, or Node.js/`typescript` compiler API for TS files) in the scratchpad. 

The raw output of this AST script acts as the absolute source of truth. The AI must cross-reference this output when writing the final Obsidian markdown to ensure zero structural elements are missed.

### Prompt Format / Workflow Enforcer

When tasked with documenting code, the AI must execute this checklist internally:

1. **Write a Temporary AST Script:** Write a small script to statically parse the target file.
2. **Execute and Capture:** Run the script to extract a raw list of all exported classes, functions, arguments, and docstrings.
3. **Draft the Documentation:** Write the human-readable Obsidian markdown document (`.md`).
4. **Coverage Audit:** Compare the drafted markdown against the raw AST output. Ensure every single extracted node exists in the documentation.
5. **Save to Vault:** Save the verified documentation to the local Obsidian Vault (`docs/` directory) via `write_to_file` or Obsidian MCP.

**Example Python AST Reference Script (for the AI's scratchpad use):**
```python
# AI should run this in a temporary scratch space to get the raw facts
import ast

def extract_structure(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            args = [a.arg for a in node.args.args]
            print(f"Function: {node.name}({', '.join(args)})")
        elif isinstance(node, ast.ClassDef):
            print(f"Class: {node.name}")

extract_structure("target_file.py")
```

## When to Use
- Whenever the user asks the AI to document a file or module into the Obsidian vault.
- When the accuracy and completeness of API signatures in documentation are critical.
