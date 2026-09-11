---
name: property-based-testing-fast-check
description: "Use when verifying edge cases, fuzzing input validation, or ensuring 100% scenario coverage across complex business logic using property-based testing with fast-check and Jest."
tier: local
target-stacks: ["fast-check", "jest", "typescript", "nestjs", "nodejs"]
metadata:
  origin: auto-extracted
---

# Property-Based Testing (PBT) with Fast-Check & Jest

**Extracted:** 2026-09-11  
**Context:** When standard example-based tests achieve 100% line/branch coverage but still miss hidden edge cases, boundary values, unexpected Unicode sequences, or invalid permutations in business logic and input validators.

---

## Problem

1. **The Example-Based Testing Trap**: Developers typically handpick 3–5 happy path and edge-case inputs (e.g., `""`, `"valid@email.com"`, `-1`). This satisfies Jest branch coverage, but real users or attackers submit unexpected permutations that crash services with unhandled exceptions.
2. **Combinatorial Explosion**: Testing combinations of multiple parameters (e.g., 4 fields with 5 boundary states each) requires $5^4 = 625$ manual unit tests.
3. **Flaky Edge-Case Discovery**: Manually reasoning about all edge cases (NaN, Infinity, surrogate pairs, null bytes, prototype pollution keys, extreme integers) is error-prone.

---

## Solution: Property-Based Testing

Instead of asserting `fn(input) === expected_output` for single hardcoded examples, Property-Based Testing (PBT) defines **Properties** (invariants that must hold true for *any* generated input) and runs hundreds of randomized test runs automatically using `fast-check`.

When a test fails, `fast-check` automatically **shrinks** the failure to the minimal reproducible counterexample (e.g., shrinking a 200-character failure down to `' '` or `'\0'`).

### The Testing Trifecta

$$\text{100% Jest Coverage} + \text{100% Stryker Mutation Score} + \text{Fast-Check Invariants} = \text{Zero Bug Escapes}$$

---

## Installation & Setup

```bash
npm install -D fast-check
```

---

## Core Testing Recipes

### 1. Invariant Properties (Roundtrip / Symmetry)

Ensure operations are perfectly reversible across arbitrary inputs (e.g., serialization, encoding, token signing/verification):

```typescript
import * as fc from 'fast-check';

describe('Serialization Roundtrip', () => {
  it('should guarantee deserialize(serialize(x)) === x for any JSON-compatible object', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          username: fc.string({ minLength: 1, maxLength: 50 }),
          isActive: fc.boolean(),
          roles: fc.array(fc.constantFrom('admin', 'user', 'guest')),
        }),
        (originalUser) => {
          const serialized = JSON.stringify(originalUser);
          const deserialized = JSON.parse(serialized);
          expect(deserialized).toEqual(originalUser);
        },
      ),
      { numRuns: 100 }, // Executes 100 randomized scenarios
    );
  });
});
```

---

### 2. Idempotence & Boundary Guarantees

Ensure repeating an operation produces identical results and stays within bounded constraints:

```typescript
import * as fc from 'fast-check';

describe('Sanitize & Pagination Invariants', () => {
  it('should be idempotent: sanitize(sanitize(x)) === sanitize(x)', () => {
    fc.assert(
      fc.property(fc.fullUnicodeString(), (rawInput) => {
        const firstPass = sanitizeInput(rawInput);
        const secondPass = sanitizeInput(firstPass);
        expect(secondPass).toBe(firstPass);
      }),
    );
  });

  it('pagination helper should always clamp within [1, maxLimit]', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (page, limit) => {
        const result = clampPagination(page, limit, 100);
        expect(result.page).toBeGreaterThanOrEqual(1);
        expect(result.limit).toBeGreaterThanOrEqual(1);
        expect(result.limit).toBeLessThanOrEqual(100);
      }),
    );
  });
});
```

---

### 3. Fuzzing DTO Validation & WebSocket Exception Filters

Ensure that *no* arbitrary, malformed, or malicious payload crashes the gateway with an unhandled exception:

```typescript
import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto Robustness Fuzzing', () => {
  it('should never throw an uncaught error when validating arbitrary payloads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.anything(),
          name: fc.anything(),
          age: fc.anything(),
        }),
        async (arbitraryPayload) => {
          // Validation should safely succeed or return ValidationError[], NEVER throw
          const dto = plainToInstance(CreateUserDto, arbitraryPayload);
          const errors = await validate(dto);
          expect(Array.isArray(errors)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
```

---

### 4. Custom Arbitraries for Domain Entities

Create reusable arbitraries for application domain types:

```typescript
// test/arbitraries/user.arbitrary.ts
import * as fc from 'fast-check';

export const arbitraryEmail = fc.emailAddress();

export const arbitraryPassword = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), { minLength: 1 }),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1 }),
    fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 1 }),
    fc.stringOf(fc.constantFrom(...'!@#$%^&*()'), { minLength: 1 }),
  )
  .map(([upper, lower, num, sym]) => `${upper}${lower}${num}${sym}`);

export const arbitraryValidUser = fc.record({
  email: arbitraryEmail,
  password: arbitraryPassword,
  name: fc.string({ minLength: 2, maxLength: 60 }),
});
```

---

### 5. Shrinking in Action (Minimal Counterexample)

When a bug exists (e.g., code fails on spaces or null bytes), Fast-Check automatically shrinks the input:

```
Property failed after 42 tests
{ seed: 1849204812, path: "41:0:1:0" }
Counterexample: ["user with space"]
Shrunk 6 time(s)
Shrunk counterexample: [" "]
```
This pinpoints the exact minimal root cause immediately without manual debugging.

---

## When to Use

- **Data parsing / serialization**: JSON, query strings, headers, token payloads.
- **Mathematical / Financial logic**: Calculations, discounts, balances, pagination arithmetic.
- **Input sanitization & security boundaries**: XSS sanitizers, slugifiers, regex matchers.
- **State machine transitions**: Order status, authentication lifecycle, subscription tiers.
- **Fuzzing WebSocket RPCs**: Ensuring gateway never crashes on hostile/unexpected socket packets.
