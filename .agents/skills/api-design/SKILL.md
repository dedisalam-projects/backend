---
name: api-design
description: "Use when designing or reviewing REST endpoints, resource naming, status codes, pagination, filtering, error responses, versioning, or rate limiting for production APIs."
metadata:
  origin: ECC
---

# API Design Patterns

Conventions and standards for designing developer-friendly, secure, and evolvable REST APIs.

## When to Activate

- Designing new REST endpoints, URL paths, and resource hierarchies
- Implementing pagination (offset vs cursor), filtering, sorting, or sparse fieldsets
- Defining error response schemas, HTTP status codes, rate limit headers, or versioning strategies

## Resource Naming & URL Structure

- **Plural nouns, lowercase, kebab-case**: `/api/v1/team-members`, `/api/v1/orders`.
- **Sub-resources for ownership**: `/api/v1/users/{id}/orders`.
- **Non-CRUD actions (use verbs sparingly as sub-actions)**: `POST /api/v1/orders/{id}/cancel`, `POST /api/v1/auth/refresh`.
- **Avoid verbs in resource paths**: Never use `/api/v1/getUsers` or `/api/v1/createOrder`.

## HTTP Methods & Status Codes

| Method | Idempotent | Safe | Typical Status Codes |
|---|---|---|---|
| `GET` | Yes | Yes | `200 OK`, `304 Not Modified` |
| `POST` | No | No | `201 Created` (with `Location` header), `202 Accepted` |
| `PUT` | Yes | No | `200 OK`, `204 No Content` (full resource replace) |
| `PATCH` | No* | No | `200 OK`, `204 No Content` (partial update) |
| `DELETE` | Yes | No | `204 No Content`, `200 OK` |

### Key Status Codes
- `201 Created`: Return `Location: /api/v1/resources/{id}` header.
- `400 Bad Request` vs `422 Unprocessable Entity`: Use 400 for malformed JSON; 422 for schema validation errors.
- `401 Unauthorized` (unauthenticated) vs `403 Forbidden` (authenticated, lacking permissions).
- `409 Conflict`: Duplicate unique resource or concurrent state race.
- `429 Too Many Requests`: Include `Retry-After: <seconds>` header.

## Standard JSON Response Envelopes

### Single Resource & Error Schema
```json
// Success Response
{
  "data": { "id": "usr_123", "email": "alice@test.com", "createdAt": "2026-01-01T00:00:00Z" }
}

// Error Response
{
  "error": {
    "code": "validation_error",
    "message": "Request payload validation failed",
    "details": [{ "field": "email", "code": "invalid_format", "message": "Email is invalid" }]
  }
}
```

### Collection Response with Pagination
```json
{
  "data": [{ "id": "ord_1" }, { "id": "ord_2" }],
  "meta": { "total": 120, "page": 1, "perPage": 20, "totalPages": 6 },
  "links": { "self": "/api/v1/orders?page=1", "next": "/api/v1/orders?page=2" }
}
```

## Pagination: Offset vs Cursor

| Strategy | Syntax | When to Use |
|---|---|---|
| **Offset-based** | `?page=2&per_page=20` | Admin portals, small datasets (<50k), where page jumping is required |
| **Cursor-based** | `?cursor=eyJpZCI6MTB9&limit=20` | Infinite scroll feeds, high-volume tables, stable under concurrent inserts |

## Query Conventions (Filtering, Sorting & Sparse Fields)

- **Filter equality**: `GET /api/v1/products?category=electronics&status=in_stock`
- **Comparison operators**: `GET /api/v1/products?price[gte]=100&price[lte]=500`
- **Sorting**: `GET /api/v1/products?sort=-createdAt,price` (minus prefix indicates descending)
- **Sparse fieldsets**: `GET /api/v1/users?fields=id,name,email`

## Rate Limiting & Versioning

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710000000
Retry-After: 60
```

### Versioning Rules
- **URL Path versioning**: `/api/v1/` (maintain at most 2 concurrent active versions).
- **Non-breaking changes**: Adding optional query params or new response keys does not bump version.
- **Breaking changes**: Renaming/removing fields or changing types requires `/api/v2/`.
- **Deprecation**: Send `Sunset: <HTTP-Date>` header; return `410 Gone` after decommission date.

## Implementation Example (TypeScript / Next.js)

```typescript
import { z } from 'zod';
import { NextResponse } from 'next/server';

const CreateItemSchema = z.object({ name: z.string().min(1), price: z.number().positive() });

export async function POST(req: Request) {
  const parsed = CreateItemSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({
      error: { code: 'validation_error', message: 'Invalid body', details: parsed.error.issues }
    }, { status: 422 });
  }
  const item = await db.items.create({ data: parsed.data });
  return NextResponse.json({ data: item }, { status: 201, headers: { Location: `/api/v1/items/${item.id}` } });
}
```

## API Design Checklist

- [ ] Resource URL is lowercase, plural noun (kebab-case; no action verbs).
- [ ] Appropriate HTTP status returned (`201` on create, `204` on empty delete).
- [ ] Input payload validated at boundary using schema (Zod / Pydantic).
- [ ] Unified error format returned (`error.code`, `error.message`, `error.details`).
- [ ] Collection endpoints implement cursor or offset pagination.
- [ ] Authentication required and resource ownership verified on mutations.
- [ ] Rate limit headers (`X-RateLimit-*`) configured.

> [!IMPORTANT]
> Always strictly follow the `api-design` conventions outlined above to ensure workspace consistency and prevent regressions.
