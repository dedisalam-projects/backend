---
name: backend-patterns
description: "Use when building or reviewing Node.js, Express, or Next.js API routes, backend architecture patterns, database optimization, or server-side data access."
metadata:
  origin: ECC
---

# Backend Development Patterns

Standard architectural patterns and best practices for scalable Node.js, Express, and Next.js backend services.

## When to Activate

- Structuring controller, service, and repository layers
- Optimizing database queries, indexes, transactions, and preventing N+1 queries
- Implementing caching patterns (Redis cache-aside, TTL invalidation)
- Configuring API middleware (JWT authentication, RBAC authorization, rate limiting)
- Standardizing API error handling, validation schemas, and structured logging
- Bootstrap seeding for microservices (see also `automated-superadmin-seeding`)

---

## 1. Architectural Layers (Controller -> Service -> Repository)

Separate HTTP mechanics, business domain rules, and data access into distinct layers:

```typescript
// 1. Repository Layer: Encapsulates database queries
export interface UserRepository {
  findById(id: string): Promise<User | null>
  updateBalance(id: string, amount: number): Promise<User>
}

// 2. Service Layer: Contains business logic & validations
export class BillingService {
  constructor(private userRepo: UserRepository) {}

  async processCharge(userId: string, amount: number): Promise<User> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new ApiError(404, 'User not found')
    if (user.balance < amount) throw new ApiError(400, 'Insufficient funds')
    return this.userRepo.updateBalance(userId, user.balance - amount)
  }
}

// 3. Controller / Route Handler: Parses request, calls service, returns HTTP response
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { amount } = await req.json()
  const user = await billingService.processCharge(params.id, amount)
  return NextResponse.json({ success: true, data: user })
}
```

---

## 2. Database Optimization & N+1 Prevention

### N+1 Query Batching
Avoid querying related records in a loop. Batch IDs and resolve via a map:
```typescript
// PASS: Batch fetch in a single query
const orders = await getOrders()
const customerIds = [...new Set(orders.map(o => o.customerId))]
const customers = await getCustomersByIds(customerIds)
const customerMap = new Map(customers.map(c => [c.id, c]))

const enrichedOrders = orders.map(order => ({
  ...order,
  customer: customerMap.get(order.customerId)
}))
```

### Selective Projection
Query only required attributes rather than `SELECT *`:
```typescript
const users = await db.user.findMany({
  where: { status: 'ACTIVE' },
  select: { id: true, email: true, role: true }
})
```

---

## 3. Cache-Aside Pattern (Redis)

Query cache first; on miss, fetch from database and populate cache with explicit TTL:
```typescript
export async function getCachedEntity<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as T

  const fresh = await fetchFn()
  if (fresh) {
    await redis.setex(key, ttlSeconds, JSON.stringify(fresh))
  }
  return fresh
}
```

---

## 4. Centralized Error Handling & Validation

Use operational `ApiError` instances and integrate schema validation (e.g. Zod):

```typescript
export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message)
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json({ success: false, error: error.message, details: error.details }, { status: error.statusCode })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: 'Validation Error', issues: error.issues }, { status: 400 })
  }
  console.error('[Unhandled Backend Error]', error)
  return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
}
```

---

## 5. Authentication & Role-Based Access Control (RBAC)

Enforce permission guards before entering controller logic:

```typescript
type Role = 'admin' | 'editor' | 'viewer'
const permissions: Record<Role, string[]> = {
  admin: ['read', 'write', 'delete', 'manage'],
  editor: ['read', 'write'],
  viewer: ['read']
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest) => {
    const userRole = req.user?.role
    if (!userRole || !permissions[userRole]?.includes(permission)) {
      throw new ApiError(403, 'Forbidden: Insufficient privileges')
    }
  }
}
```

---

## 6. Rate Limiting & Structured Logging

- **Shared Store Limiting**: In multi-instance / serverless deployments, rate limiting must utilize Redis or an API gateway. Never use local process memory counters.
- **Structured JSON Logging**: Emit structured logs including `timestamp`, `level`, `requestId`, `userId`, and `latencyMs` for observability.

```typescript
export function logEvent(level: 'info' | 'warn' | 'error', message: string, context: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  }))
}
```

---

## Key Anti-Patterns

| Anti-Pattern | Risk | Correct Pattern |
|---|---|---|
| In-memory state in serverless | State loss across container restarts | Use Redis, Postgres, or durable store |
| Unbounded `findMany()` | Memory overflow and server crash | Always enforce pagination (`limit`, `cursor`/`offset`) |
| Silent database errors | Swallowed root causes and hanging requests | Log operational errors and return standard HTTP codes |
| Hardcoded admin credentials | Security breaches in production | Seed via environment variables on bootstrap |

> [!IMPORTANT]
> **Rule Adherence**: Always strictly follow the `backend-patterns` conventions outlined above to ensure workspace consistency and prevent regressions.
