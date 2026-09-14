---
name: cross-port-auth
description: "Use when building micro-frontends on different local ports or implementing cross-domain auth where localStorage cannot be shared directly."
---

# Cross-Port Authentication Pattern

## Context
When running micro-frontends (like an Auth app and a Dashboard app) on different local ports (e.g. `localhost:4002` vs `localhost:4000`), they run in different origins. Standard `localStorage` is scoped to the origin (protocol + domain + port). 

Because of this, if a user successfully logs in on `localhost:4002`, saving the token to `localStorage` on that origin will NOT make it available to `localhost:4000`.

## The Solution
To successfully pass the token from the Auth app to the Dashboard app:

1. **URL Token Passing via Environment Configuration:**
   Append the token as a query parameter when redirecting via `window.location.href`, resolving the target dashboard origin dynamically from `environment.appUrls.dashboard`:
   ```typescript
   import { environment } from '../../../environments/environment';

   // In Auth App (Dynamic dev vs prod)
   if (token) {
       window.location.href = `${environment.appUrls.dashboard}/?token=${encodeURIComponent(token)}`;
   }
   ```

2. **Angular Guard Interception:** The target app (Dashboard) must intercept this token in its guard, save it to its own `localStorage`, and then ideally strip it from the URL.

## The Angular Trap: `window.location.search` vs `ActivatedRouteSnapshot`
If you attempt to read the token in an Angular Guard using native browser APIs:
```typescript
// BAD: Will often return empty in Angular Guards!
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token'); 
```
**Why it fails:** Angular's router starts processing the URL early. Depending on the timing and redirects, `window.location.search` might be empty or stripped by the time the guard runs.

**The Fix:** Always use the `ActivatedRouteSnapshot` provided by the guard parameters and resolve fallback redirects from `environment`:
```typescript
import { CanActivateFn } from '@angular/router';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = (route, state) => {
    if (typeof window !== 'undefined') {
        // GOOD: Use the Angular route snapshot
        const urlToken = route.queryParams['token'];
        
        if (urlToken) {
            localStorage.setItem('accessToken', urlToken);
            // Optionally remove it from the URL without reloading the page
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const token = localStorage.getItem('accessToken');
        if (token) {
            return true;
        }
        
        // Redirect back to auth app dynamically via environment config
        window.location.href = `${environment.appUrls.auth}/`;
        return false;
    }
    return false; // SSR fallback
};
```

## Related: NestJS Gateway Response Wrapping
When integrating with a backend like NestJS Microservices, Gateway controllers often wrap internal service responses in standard interceptors (e.g., `{ statusCode, message, data }`).
When consuming these APIs on the frontend, watch out for this wrapper:
```typescript
// If the microservice returned { accessToken: "..." }
// The Gateway might serve it as { data: { accessToken: "..." } }

// Defensive parsing pattern:
const token = res.data?.accessToken || res.accessToken;
```
