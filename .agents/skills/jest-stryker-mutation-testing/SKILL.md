---
name: jest-stryker-mutation-testing
description: "Use when evaluating test quality beyond line coverage, configuring StrykerJS with Jest in TypeScript/NodeJS, or eliminating surviving mutants to ensure bulletproof regression guards."
tier: local
target-stacks: ["jest", "strykerjs", "typescript", "nestjs", "nodejs"]
metadata:
  origin: auto-extracted
---

# Jest Coverage & StrykerJS Mutation Testing Blueprint

**Extracted:** 2026-09-10  
**Context:** When high line coverage (80-100%) gives a false sense of security, and true test resilience must be proven by validating that unit tests fail when bugs are injected into the codebase.

## Problem

1. **The Code Coverage Illusion**: Standard Jest coverage measures *which lines were executed*, not *what was verified*. A test that invokes a function without checking edge cases or making assertions will achieve 100% line coverage while catching zero bugs.
2. **Undetected Regressions**: Modifying operators (`>` to `>=`, `+` to `-`, boolean literals, or removing error throws) frequently passes green in CI because assertions are too shallow.
3. **Slow Mutation Test Runs**: Running every test against hundreds of mutated code variants without coverage-guided test selection takes hours on large codebases.

---

## Solution

### 1. Code Coverage vs Mutation Score

| Metric | Tool | Meaning | Failure Mode |
|---|---|---|---|
| **Line Coverage** | Jest (`--coverage`) | Was this line executed? | `expect(true).toBe(true)` gives 100% line coverage. |
| **Branch Coverage** | Jest (`--coverage`) | Were both `if` / `else` executed? | Misses boundary flips like `<` vs `<=`. |
| **Mutation Score** | StrykerJS (`npx stryker run`) | Did tests break when source was modified? | Surviving mutants expose weak or missing assertions. |

$$\text{Mutation Score} = \frac{\text{Killed Mutants} + \text{TimedOut Mutants}}{\text{Total Mutants} - \text{Ignored Mutants}} \times 100\%$$

---

### 2. StrykerJS + Jest Configuration (`stryker.config.mjs`)

Install core dependencies:
```bash
npm install -D @stryker-mutator/core @stryker-mutator/jest-runner @stryker-mutator/typescript-checker
```

Create `stryker.config.mjs` at workspace or project root:

```javascript
// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  testRunnerNodeArgs: ['--experimental-vm-modules'],
  coverageAnalysis: 'perTest', // CRITICAL: runs only tests that actually cover each mutant
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.base.json',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.ts',
    enableFindRelatedTests: true,
  },
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fails CI if mutation score is below 50%
  },
  concurrency: 4,
  timeoutMS: 10000,
  incremental: true, // Speeds up consecutive local runs
};
```

---

### 3. Recipes for Eliminating Surviving Mutants

#### A. Boundary Mutants (Equality & Comparison)
- **Mutant**: `if (age >= 18)` mutated to `if (age > 18)`.
- **Why it survived**: Tests only checked `age = 25` and `age = 10`.
- **Fix**: Add a boundary test at exact edge value:
  ```typescript
  it('should allow access at exactly 18 years old', () => {
    expect(isAdult(18)).toBe(true);
  });
  ```

#### B. Fallback / Logical Operator Mutants
- **Mutant**: `const limit = options?.limit ?? 10` mutated to `options?.limit`.
- **Why it survived**: Tests always passed explicit options `{ limit: 20 }`.
- **Fix**: Test with undefined options:
  ```typescript
  it('should use default limit when options are omitted', () => {
    expect(getItems()).toHaveLength(10);
  });
  ```

#### C. Error Handling Mutants (BlockStatement / Throws)
- **Mutant**: `throw new BadRequestException('User not found')` replaced with `return undefined`.
- **Why it survived**: Test asserted with loose try/catch or checked generic truthiness.
- **Fix**: Use precise rejection and message assertion:
  ```typescript
  await expect(service.find('invalid-id'))
    .rejects
    .toThrow(new BadRequestException('User not found'));
  ```

#### D. Justified Equivalent Mutants (Ignored Lines)
When a mutant is mathematically or semantically untestable:
```typescript
// Stryker disable next-line EqualityOperator: defensive assertion already guarded by DTO schema
if (data.id === null) return;
```

---

### 4. Fast Local & CI Workflow

1. **Quick Coverage Check (Jest)**:
   ```bash
   npx jest --coverage --coverageReporters=text-summary
   ```
2. **Incremental Mutation Run (Changed files only)**:
   ```bash
   npx stryker run --mutate $(git diff --name-only origin/main | grep 'src/.*\.ts$' | paste -sd, -)
   ```
3. **Inspect Interactive HTML Report**:
   Open `reports/mutation/mutation.html` in browser to drill down into surviving mutants line-by-line.

---

### 5. NestJS Microservices, Gateways & Decorator 100% Coverage Recipes

#### A. Decorator Metadata Crash (`Reflect.getMetadata is not a function`)
- **Root Cause**: Tests exercising classes decorated with `class-validator` or `class-transformer` (such as configuration DTOs or request payloads) fail in isolated Jest environments if reflection metadata is not loaded.
- **Solution**: Add explicit import at the top of the test file:
  ```typescript
  import 'reflect-metadata';
  ```

#### B. Covering `@Type(() => Number)` Arrow Function Callbacks
- **Problem**: In DTOs with `@Type(() => Number)`, the arrow callback `() => Number` is only invoked when input values require implicit conversion. If tests only pass pre-parsed numbers (e.g. `{ port: 3000 }`), the callback remains uncovered.
- **Solution**: Pass stringified numbers in test payloads to force `class-transformer` execution:
  ```typescript
  const validConfig = {
    PORT: '3000', // Triggers @Type(() => Number) execution
  };
  const result = validate(validConfig);
  expect(result.PORT).toBe(3000);
  ```

#### C. WebSocket Exception Filter Dual-Dispatch (`emitWithAck` vs `client.emit`)
- **Problem**: NestJS `WsExceptionFilter` must handle both acknowledgment-based requests (`emitWithAck`) and fire-and-forget socket events.
- **Solution**: In unit tests, simulate both calling conventions and defensive null guards:
  ```typescript
  // Test Ack callback dispatch
  const ackCallback = jest.fn();
  const host = {
    switchToWs: () => ({ getClient: () => mockClient }),
    getArgs: () => [{}, ackCallback], // function in args indicates ack
  };
  filter.catch(new WsException('Error'), host);
  expect(ackCallback).toHaveBeenCalledWith(expect.objectContaining({ success: false }));

  // Test client.emit fallback when no callback is present
  host.getArgs = () => [{}];
  filter.catch(new Error('Boom'), host);
  expect(mockClient.emit).toHaveBeenCalledWith('exception', expect.anything());
  ```

#### D. Exhaustive Handshake & Token Extraction Fallback Branches
- **Problem**: Guards extracting tokens from `socket.handshake` have multiple chained nullish coalescing checks (`client.handshake?.auth?.token`, `headers?.authorization`, `query?.token`).
- **Solution**: Systematically test every negative combination:
  1. `client = null` or `{}` (missing handshake) -> throws `WsException`
  2. `client = { handshake: {} }` (empty handshake falls through to final `return null`)
  3. `handshake.query.token = 12345` (non-string type guard)
  4. `client.data = undefined` (triggers `client.data = client.data || {}`)

#### E. Mongoose Query Chaining Mocks
- **Problem**: Chained Mongoose calls (`find().sort().skip().limit()`) fail if mocks don't support continuous chaining.
- **Solution**: Use `mockReturnThis()` on intermediate query operations:
  ```typescript
  const mockChain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([mockItem]),
  };
  mockUserModel.find.mockReturnValue(mockChain);
  ```

#### F. Nx Monorepo Sandbox Collision (`MultipleProjectsWithSameNameError`)
- **Problem**: StrykerJS creates isolated sandboxes under `.stryker-tmp/sandbox-xxxx/`. During subsequent task runs or when Nx daemon updates the project graph, Nx recursively scans all subdirectories and crashes with `MultipleProjectsWithSameNameError` because projects are discovered in both root and `.stryker-tmp/`.
- **Solution**:
  1. Add `.stryker-tmp` and `reports` to `.nxignore` (creates an explicit exclusion boundary for Nx project graph scanning).
  2. Add `.stryker-tmp` and `reports` to `.gitignore`.
  3. Run `npx nx reset` to clear the daemon's in-memory graph cache.

#### G. Killing Constant Metadata Key Mutants (`ROLES_KEY = ""`)
- **Problem**: In decorator tests, if assertions only verify `Reflect.getMetadata(ROLES_KEY, target) === expected`, mutating `ROLES_KEY = ""` mutates both the setter and the getter equally, allowing the mutant to survive undetected despite 100% line/branch coverage.
- **Solution**: Explicitly assert the exact string literal value of the metadata key in the unit test:
  ```typescript
  expect(ROLES_KEY).toBe('roles');
  expect(IS_PUBLIC_KEY).toBe('isPublic');
  ```
  This guarantees a 100.00% mutation kill score on constants.

#### H. Stryker Monorepo Jest Environment Mismatch (`jest-environment-jsdom`)
- **Problem**: Stryker's default Jest runner falls back to `jsdom` if unspecified, crashing NestJS backend tests with `Validation Error: Test environment jest-environment-jsdom cannot be found`.
- **Solution**: In `stryker.config.mjs`, point `configFile` to the project's Jest config and explicitly configure `testEnvironment: 'node'`:
  ```javascript
  jest: {
    projectType: 'custom',
    configFile: 'libs/common/jest.config.cts',
    config: { testEnvironment: 'node' },
  }
  ```

#### I. JWT Sub-Second `iat` Collisions in Refresh Tests
- **Problem**: `jwt.sign()` operates at 1-second resolution (`iat` in integer seconds). Executing login and refresh within milliseconds produces identical tokens because the payload and `iat` are identical, causing `expect(newToken).not.toBe(oldToken)` to fail.
- **Solution**: Inject a `1100ms` delay before refresh or assert token validity rather than timestamp difference:
  ```typescript
  await new Promise((r) => setTimeout(r, 1100));
  const refreshRes = await authSocket.emitWithAck('auth:refresh', { userId, refreshToken });
  expect(refreshRes.data.accessToken).not.toBe(oldToken);
  ```

---

## When to Use

- When writing high-risk business logic (financial calculations, authorization rules, data transformations).
- When a service reports 90%+ line coverage but regressions still slip through code reviews.
- When configuring automated mutation testing gates in CI pipelines.
