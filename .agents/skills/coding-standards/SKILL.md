---
name: coding-standards
description: "Use when reviewing code quality or naming with no framework-specific skill that applies. — Baseline cross-project coding conventions for naming, readability, immutability, and code-quality review. Use detailed frontend or backend skills for framework-specific patterns"
metadata:
  origin: ECC
---

# Coding Standards & Best Practices

Baseline cross-project coding conventions for naming, readability, immutability, and code-smell prevention.

## When to Activate

- Writing or refactoring code without a narrower framework-specific skill
- Enforcing core principles (KISS, DRY, YAGNI, immutability)
- Reviewing naming clarity, nesting depth, error handling, or test structure

## Core Principles

1. **Readability First**: Code is read far more often than written. Write self-documenting code with clear variable and function names.
2. **KISS (Keep It Simple)**: Favor the simplest workable solution over clever or speculative abstractions.
3. **DRY (Don't Repeat Yourself)**: Extract identical logic into reusable helper functions or pure utilities.
4. **YAGNI (You Aren't Gonna Need It)**: Do not build features or architectural layers until there is an immediate requirement.

## Naming Conventions

- **Variables & Properties**: Descriptive camelCase nouns (`isUserAuthenticated`, `marketSearchQuery`). Never use cryptic single letters (`q`, `flag`, `x`).
- **Functions & Methods**: Verb-noun pattern indicating intent (`fetchUserData`, `calculateTax`, `isValidEmail`).
- **Constants**: `SCREAMING_SNAKE_CASE` for global immutable constants (`MAX_RETRIES`, `DEBOUNCE_DELAY_MS`).
- **File Names**: `PascalCase.tsx` for components/classes; `camelCase.ts` for utilities, services, and hooks (`useAuth.ts`, `formatDate.ts`).

## Immutability by Default

Always treat state, input parameters, and data structures as immutable:

```typescript
// GOOD: Immutable updates using spread
const updatedUser = { ...user, status: 'active' };
const updatedList = [...items, newItem];

// BAD: Direct mutation causes side effects and cache invalidation bugs
user.status = 'active';
items.push(newItem);
```

## Error Handling & Async Discipline

```typescript
// Comprehensive error handling with context
async function fetchResource(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    logger.error('Resource fetch failed', { url, error });
    throw new Error('Failed to retrieve resource data');
  }
}

// Parallel execution for independent async operations
const [users, products, metrics] = await Promise.all([
  fetchUsers(),
  fetchProducts(),
  fetchMetrics()
]);
```

## Comments & Documentation

- **Explain WHY, not WHAT**: Code describes what is happening; comments explain non-obvious business rules or performance trade-offs.
- **JSDoc / TSDoc for Public APIs**: Document parameters, return values, and expected exceptions on exported functions.

```typescript
// GOOD: Explains non-obvious rationale
// Use exponential backoff to avoid cascading failures during rate-limiting
const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
```

## Testing Standards (AAA Pattern)

Follow Arrange-Act-Assert structure with descriptive, behavioral test names:

```typescript
test('returns empty array when search query has no matching records', async () => {
  // Arrange
  const service = new SearchService(mockDb);
  // Act
  const results = await service.search('nonexistent');
  // Assert
  expect(results).toEqual([]);
});
```

## Code Smells & Anti-Patterns

| Code Smell | Problem | Remediation |
|---|---|---|
| Deep Nesting (>3 levels) | High cognitive complexity | Use guard clauses and early returns |
| Functions > 50 lines | Multiple mixed responsibilities | Decompose into focused single-purpose helpers |
| Magic Numbers / Strings | Obscures intent and breaks reuse | Extract named constants (`MAX_RETRIES = 3`) |
| Silent Catch Blocks | Suppresses errors and hides failures | Log errors with context and propagate or handle |
| Using `any` in TypeScript | Disables type checker safety | Declare explicit interfaces, generics, or `unknown` |

> [!IMPORTANT]
> Always strictly follow the `coding-standards` conventions outlined above to ensure workspace consistency and prevent regressions.
