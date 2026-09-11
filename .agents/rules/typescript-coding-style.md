---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript Coding Style

## Explicit Types on Public Surfaces
- Explicitly type parameters, return types, and public class methods.
- Allow TypeScript to infer obvious local variables (`const count = 0;`).
- Extract recurring object structures into named `interface` or `type`.

## Interfaces vs. Type Aliases
- **`interface`**: Object shapes, service contracts, extensible models.
- **`type`**: Unions (`type Status = 'pending' | 'success' | 'error'`), intersections, primitives, tuples.
- Prefer string literal unions over runtime `enum` unless required for external interop.

## Strict Type Safety (No `any`)
- Never use `any` in application code.
- Use `unknown` for untrusted or external inputs, and narrow safely:
```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? 'Unknown error');
}
```

## Immutability
- Treat inputs and parameters as readonly (`Readonly<T>`, `readonly string[]`).
- Use object/array spreads or immutable methods instead of mutating state in-place:
```typescript
function updateUser(user: Readonly<User>, name: string): User {
  return { ...user, name };
}
```

## Error Handling & Async
- Use `async` / `await` with typed `try` / `catch` blocks.
- Never swallow exceptions silently; log via structured logger or rethrow domain errors.
- Never leave `console.log` statements in production code.

## Schema Validation
- Use validation libraries (such as Zod) at system boundaries (HTTP requests, environment variables, user inputs) and infer TypeScript types directly from schemas (`z.infer<typeof schema>`).
