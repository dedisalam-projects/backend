---
name: environment-variable-audit
description: "Use when auditing, validating, synchronizing, or diagnosing environment variables across project .env files, Docker Compose interpolation, and Windows User global variables"
tier: local
target-stacks: ["docker", "docker-compose", "powershell", "windows", "bash"]
metadata:
  origin: auto-extracted
---

# Environment Variable Audit & Synchronization Protocol

**Extracted:** 2026-09-13  
**Context:** Auditing, validating, and managing environment variables across project configuration files (`.env`, `.env.example`), Docker Compose interpolations (`${VAR}`), and persistent Windows User global variables (`HKCU:\Environment`).

---

## Problem

1. **Silent Compose Failures**: Missing environment variables cause Docker Compose to fall back to empty strings with low-visibility warnings, resulting in broken database connections or unauthenticated services.
2. **Configuration Drift**: Variables defined in `.env.example` fall out of sync with `${VAR}` interpolations in `docker-compose.yml` or active `.env` files.
3. **Dangling Global Variables**: Variables from retired architectures (e.g. `DEV_SERVER_IP` after server dev retirement) persist in the host environment and cause agent confusion.
4. **Windows Broadcast Hangs**: Running .NET `[Environment]::SetEnvironmentVariable(..., "User")` in PowerShell broadcasts `WM_SETTINGCHANGE` to all top-level desktop windows via `SendMessageTimeout`, which hangs terminal sessions if any window is unresponsive.
5. **Accidental Credential Exposure**: Active `.env` files containing secrets risk being tracked by Git if `.gitignore` rules are incomplete.

---

## Solution: The 3-Pillar Audit Protocol

### Pillar 1: Template & Interpolation Parity
Extract all `${VAR}` interpolations from compose files and match them against `.env.example`:

```powershell
# Extract all unique interpolated variables from compose files
$composeVars = Select-String -Path "docker-compose*.yml" -Pattern '\$\{([A-Za-z0-9_]+)\}' -AllMatches |
    ForEach-Object { $_.Matches } |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique

# Check if any required variable is missing from .env
foreach ($var in $composeVars) {
    $val = [Environment]::GetEnvironmentVariable($var)
    if (-not $val -and (Test-Path .env)) {
        $inEnv = Get-Content .env | Select-String "^$var="
        if (-not $inEnv) { Write-Warning "Missing variable in environment or .env: $var" }
    }
}
```

### Pillar 2: Non-Blocking Windows Registry Management (Global Variables)
To inspect, set, or delete Windows User Environment variables without suffering `WM_SETTINGCHANGE` broadcast hangs, manipulate `HKCU:\Environment` directly:

```powershell
# 1. Read all user environment variables
Get-ItemProperty -Path 'HKCU:\Environment'

# 2. Inspect specific variables
Get-ItemProperty -Path 'HKCU:\Environment' | Select-Object MONGO_*, REDIS_*, RABBITMQ_*

# 3. Set a persistent user variable (Instant & Non-blocking)
Set-ItemProperty -Path 'HKCU:\Environment' -Name 'REDIS_PASSWORD' -Value 'redispassword'

# 4. Remove a dangling or deprecated variable
Remove-ItemProperty -Path 'HKCU:\Environment' -Name 'DEV_SERVER_IP' -ErrorAction SilentlyContinue
```

### Pillar 3: Security & Leak Guard
Ensure all `.env` files are ignored by version control:

```powershell
# Verify .gitignore coverage
git check-ignore -v .env .env.local .env.development

# Verify no secrets are staged
git status --porcelain | Select-String '\.env'
```

---

## Verification Command

After updating or setting environment variables, validate compose interpolation with zero warnings:

```bash
docker compose config --quiet
```
- **Exit Code 0 with empty stderr** confirms 100% of required variables are populated and syntax is pristine.

---

## When to Use

- When adding new backing services or microservice ports to Docker Compose.
- When developer or CI terminal logs show `"The <VAR> variable is not set. Defaulting to a blank string."`
- When deprecating old services or IPs and cleaning up host environment variables.
- When setting up a new developer machine and populating Windows User variables from `.env.example`.
