---
name: customization-audit-runner
description: "Use when the user asks to audit customizations, audit customization, or check customization health."
tier: local
target-stacks: ["python", "bash"]
metadata:
  origin: auto-extracted
---

# Customization Audit Local Runner

**Extracted:** 2026-09-19
**Context:** When requested to audit customizations, always prioritize running the local audit script instead of manual inspection or security scans.

> [!CAUTION]
> **Safety Guardrail**: Automated auto-fix (`--fix`) or sync (`--sync`) modifies customization files in place. Always request user confirmation or approval before running with mutating flags.

## Problem
The global `customization-audit` skill is frequently excluded due to context budget limits, leading agents to use `security-scan` or manual inspection incorrectly.

## Solution
Always execute the `audit_customizations.py` script located in the `.agents/scripts` directory.

```powershell
# Run the audit script from the workspace root
python -X utf8 .agents/scripts/audit_customizations.py

# Auto-fix mode (if requested)
# python -X utf8 .agents/scripts/audit_customizations.py --fix

# Auto-sync mode (if requested)
# python -X utf8 .agents/scripts/audit_customizations.py --sync
```

## When to Use
Use when asked to "audit customizations", "audit customization", or check customization health.
