---
name: security-review
description: "Use when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features."
metadata:
  origin: ECC
---

# Security Review Skill

Comprehensive security checklist and verification rules for web applications, APIs, authentication, and data integrity.

## When to Activate

- Implementing authentication, authorization, or role-based access control (RBAC)
- Handling user input, query parameters, file uploads, or third-party webhooks
- Provisioning environment variables, API credentials, or payments
- Exposing new public or authenticated REST / GraphQL endpoints

## 1. Secrets Management & Environment Configuration

- **Zero Hardcoded Secrets**: Never commit API keys (`sk-...`), private keys, or passwords.
- **Fail Early**: Assert existence of critical secrets on startup.
- **VCS Protection**: Ensure `.env.local`, `.env.*.local`, and credential files are strictly gitignored.

```typescript
const apiKey = process.env.API_SECRET_KEY;
if (!apiKey) throw new Error('API_SECRET_KEY must be defined in environment');
```

## 2. Input Validation & File Upload Security

Validate all untrusted input at runtime using schema validators (e.g. Zod) before executing application logic:

```typescript
import { z } from 'zod';

const UserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['viewer', 'editor'])
});

export function validatePayload(raw: unknown) {
  return UserInputSchema.parse(raw);
}

// File Upload Validation: enforce size, MIME-type, and extension
function validateFile(file: File) {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  if (file.size > MAX_SIZE) throw new Error('File exceeds 5MB limit');
  if (!ALLOWED.includes(file.type)) throw new Error('Disallowed file type');
}
```

## 3. SQL Injection & Database Isolation

Never concatenate untrusted input into SQL queries. Always use parameterized queries, typed ORMs, or Row-Level Security:

```typescript
// Parameterized SQL
await db.query('SELECT * FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);

// Supabase / PostgREST query
const { data } = await supabase.from('users').select('*').eq('email', email);
```

```sql
-- Supabase Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
```

## 4. Authentication, Cookies & Session Management

- **Storage**: Store JWTs and session tokens in `HttpOnly; Secure; SameSite=Strict` cookies (never `localStorage`).
- **Authorization**: Validate user permissions and ownership on every request; never rely solely on frontend guards.

```typescript
// Set secure auth cookie
res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`);
```

## 5. XSS & Content Security Policy (CSP)

- Use DOMPurify for any unavoidable HTML rendering (`dangerouslySetInnerHTML`).
- Configure explicit CSP headers in HTTP responses:

```typescript
// Next.js security headers
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none';";
```

## 6. CSRF, Rate Limiting & Error Sanitization

- **CSRF**: Require custom headers (`X-Requested-With`, `X-CSRF-Token`) for mutating state.
- **Rate Limiting**: Apply IP and token-based rate limiting on sensitive routes (auth, password reset, expensive queries).
- **Error Masking**: Never return raw stack traces or internal DB error codes to client responses; log detailed errors server-side and return generic user messages.

```typescript
// Generic user response
catch (err) {
  logger.error('Unhandled API exception', { error: err });
  return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
}
```

## Pre-Deployment Security Checklist

- [ ] All environment secrets externalized; no secrets in git history.
- [ ] Runtime schema validation on every API endpoint.
- [ ] Zero SQL string interpolations; parameterized queries enforced.
- [ ] Authentication cookies configured with `HttpOnly; Secure; SameSite=Strict`.
- [ ] Row-Level Security (RLS) active on multi-tenant tables.
- [ ] XSS sanitization (DOMPurify) and CSP headers active.
- [ ] Rate limiters active on public and auth endpoints.
- [ ] `npm audit` / `cargo audit` reports 0 critical or high CVEs.

> [!IMPORTANT]
> Always strictly follow the `security-review` conventions outlined above to ensure workspace consistency and prevent regressions.
