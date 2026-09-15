---
name: cross-port-auth
description: "Use when designing authentication for micro-frontends across different ports or subdomains, or when deciding between localStorage, document.cookie, and HttpOnly cookies — architecture patterns, anti-pattern warnings, and backend contracts."
tier: local
target-stacks: ["angular", "typescript", "nestjs"]
metadata:
  origin: auto-extracted
---

# Cross-Port & Multi-Subdomain Authentication Pattern

## Context
When running micro-frontends across subdomains (e.g. `auth.domain.com`, `dash.domain.com`, `api.domain.com`) or distinct local development ports (e.g. `localhost:4002` vs `localhost:4000`), they execute in different browser origins.

Under the browser Same-Origin Policy (`Protocol + Host + Port`):
- `localStorage` is **strictly isolated per origin**.
- Storing an authentication token in `localStorage` on `auth.domain.com` (or port `:4002`) will **never** be accessible to `dash.domain.com` (or port `:4000`).

---

## Architectural Decision Matrix: `localStorage` vs `HttpOnly Cookie` vs `Client Cookie`

| Criterion | `HttpOnly Cookie` (Backend Set) | `Client Cookie` (`document.cookie`) | `localStorage` (Client-Side) |
| :--- | :--- | :--- | :--- |
| **Primary Use Case** | **Authentication & Session Tokens** | **Intermediate Multi-Subdomain Token Sharing** | **Non-sensitive Client State & UI Preferences** |
| **Multi-Subdomain Sharing** | ✅ **Natively supported** via `Domain=.domain.com; Path=/` | ✅ **Supported** via `domain=.domain.com; path=/` | ❌ **Impossible** (Strictly isolated per origin) |
| **XSS Attack Immunity** | ✅ **Immune** (Inaccessible to client JavaScript) | ❌ **Vulnerable** (Accessible via `document.cookie`) | ❌ **Vulnerable** (Accessible via `localStorage.getItem()`) |
| **Automated Transmission** | ✅ **Automatic** on HTTP requests & WebSocket handshake (`withCredentials: true`) | ✅ **Automatic** on HTTP requests & WebSocket handshake | ❌ **Manual** (Requires custom headers & interceptors) |
| **Acceptable Scenarios** | • User session tokens<br>• Refresh tokens<br>• Production cross-subdomain SSO | • Frontend-managed tokens during migration before backend `Set-Cookie` support | • UI theme (dark/light)<br>• Sidebar collapse state<br>• Form draft inputs (non-PII) |
| **Prohibited Scenarios** | • Large cached payloads (> 4KB) | • Highly sensitive financial/admin tokens without short TTL | ❌ **Multi-subdomain auth tokens**<br>❌ **Sensitive credentials / PII** |

---

## The Standard Solution: Wildcard Root-Domain Cookies

To share sessions across subdomains without leaking tokens into URLs:

### 1. Backend HttpOnly Cookie (OWASP Gold Standard)
The NestJS API Gateway sets the cookie on login / token refresh:
```http
Set-Cookie: accessToken=<jwt>; Domain=.dedisalam.my.id; Path=/; SameSite=Lax; Secure; HttpOnly
Set-Cookie: refreshToken=<jwt>; Domain=.dedisalam.my.id; Path=/api/v1/auth/refresh; SameSite=Lax; Secure; HttpOnly
```

### 2. Frontend Intermediate Pattern (When Backend Returns JSON Body)
If the backend returns tokens via JSON body (`{ accessToken: "..." }`) or WebSocket ACK, the Auth app writes a wildcard cookie before redirecting:
```typescript
const domainAttr = environment.cookieDomain ? `; domain=${environment.cookieDomain}` : '';
const secureAttr = environment.production ? '; Secure' : '';

// Save to shared root domain (.dedisalam.my.id)
document.cookie = `accessToken=${token}; path=/${domainAttr}; max-age=604800; SameSite=Lax${secureAttr}`;

// Clean redirect without URL tokens
window.location.href = `${environment.appUrls.dashboard}/`;
```

---

## Anti-Pattern Warning: URL Token Passing (`?token=...`)

Passing tokens via URL query parameters (`window.location.href = `${dashboard}/?token=${token}`) is an anti-pattern. While often used as a quick localhost development hack, it introduces critical bugs:

1. **Subroute Deep-Linking Fails**:
   If the token is only extracted when landing on the root path (`/`), direct navigation to `/users` or bookmarks will fail with unauthenticated errors because query parameters are absent.
2. **`replaceState` Token Loss**:
   When the root guard strips the query parameter via `window.history.replaceState`, subsequent page refreshes or internal router navigation lose the initial token context.
3. **Eager Service Race Conditions**:
   Angular services with eager constructor initialization (such as `UserService` initiating WebSocket connections on bootstrap) run before the router guard processes URL query parameters. This leads to socket connections with `auth: { token: null }` &rarr; 401 Handshake Error.
4. **Security Exposure (CWE-598)**:
   Raw JWTs leak into browser history, web server access logs (Nginx / Cloudflare), and HTTP `Referer` headers when clicking external links.

---

## Angular Guard: Cookie-First Authentication Pattern

Always read the authentication token directly from cookies rather than relying on URL parameters or isolated `localStorage`:

```typescript
import { CanActivateFn } from '@angular/router';
import { environment } from '../../environments/environment';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
}

function isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return false;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return !payload.exp || payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
}

export const authGuard: CanActivateFn = (route, state) => {
    if (typeof window !== 'undefined') {
        // 1. Primary: Read from shared root-domain cookie
        const cookieToken = getCookie('accessToken');
        if (cookieToken && isTokenValid(cookieToken)) {
            return true;
        }

        // 2. Unauthenticated: Redirect to auth login
        window.location.href = `${environment.appUrls.auth}/login`;
        return false;
    }
    return false; // SSR fallback
};
```

---

## WebSocket Handshake Authentication Contract

When connecting via Socket.IO across subdomains:
- Browser WebSocket clients automatically transmit cookies during the HTTP upgrade handshake when `{ withCredentials: true }` is enabled.
- The Backend Gateway should support both `handshake.headers.cookie` (for browser micro-frontends) and `handshake.auth.token` (for native mobile or CLI clients).

```typescript
// Dashboard WebSocket Initialization
this.socket = io(`${environment.socketUrl}/users`, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: { token: this.getToken() },
    autoConnect: true
});
```

---

## Defensive API Envelope Parsing

When consuming backend responses wrapped by NestJS Interceptors (`{ statusCode, message, data }`):
```typescript
// If the microservice returned { accessToken: "..." }
// The Gateway may serve it as { data: { accessToken: "..." } }
const token = res.data?.accessToken || res.accessToken;
```
