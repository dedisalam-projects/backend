---
name: two-phase-loading-architecture
description: "Use when deciding between splash screens and skeleton screens, or when designing loading states across micro-frontends and SPAs — implement the two-phase hybrid loading architecture with pre-bootstrap splash and post-bootstrap data skeletons."
tier: local
target-stacks: ["angular", "react", "vue", "ssr", "microfrontend"]
metadata:
  origin: auto-extracted
---

# Two-Phase Loading Architecture (Splash vs Skeleton)

**Extracted:** 2026-09-15  
**Context:** Standardizes application loading states across micro-frontends, SPAs, and SSR-hybrid architectures to eliminate Flash of Unauthorized Content (FOUAC), Flash of Unstyled Content (FOUC), and Cumulative Layout Shift (CLS).

## Problem

Developers frequently treat **Splash Screens** and **Skeleton Screens** as mutually exclusive choices (*"Which one is better?"*), leading to critical frontend failures:
1. **FOUAC via Premature Skeletons**: Placing skeletons directly in `index.html` renders private dashboard wireframes before `authGuard` execution, leaking private layouts to unauthenticated users prior to login redirects.
2. **CLS via Mismatched Pre-Bootstrap Skeletons**: Hardcoding skeletons in `index.html` causes layout shifts when users navigate to different route views (e.g. settings vs dashboard overview).
3. **Sluggish UX via Post-Bootstrap Blocking Loaders**: Using full-screen modal spinners during asynchronous API data fetching blocks user interaction with navigation and filters.

## Solution: The Two-Phase Hybrid Model

Separate loading responsibilities strictly by lifecycle stage:

```
[Navigation Initiated]
        │
        ▼
Phase 1: Pre-Bootstrap App Shell (0ms - ~1.5s)
  • Technology: Pure inline CSS + HTML Splash in index.html
  • Content: Brand-neutral spinner + "Loading..."
  • Responsibility: Block white screen, gate on fonts/assets, mask unauthenticated routes (Anti-FOUAC)
        │
        ▼ (Angular Bootstrapped, authGuard passed, Shell Mounted)
Phase 2: Post-Bootstrap Data Fetching (~200ms - 800ms)
  • Technology: Granular Component Skeletons (<p-skeleton>)
  • Content: Exact geometric wireframes matching incoming data cards/tables
  • Responsibility: Preserve layout stability (CLS = 0.000), allow interactive navigation
        │
        ▼ (API Data Arrives)
[Fully Interactive Live View]
```

### Phase 1 Implementation Rules (App Shell Splash)

1. **Location**: Directly inside `<app-root>` or fixed overlay in `index.html` using 100% inline CSS (zero external bundle dependencies).
2. **Copy Standard**: Universal, brand-neutral `<div class="app-splash-text">Loading...</div>` with `aria-label="Loading application"`.
3. **Cross-Port Uniformity**: Micro-frontends across different ports (e.g. 4000, 4001, 4002) must share identical splash dimensions, colors, and timing to guarantee seamless transitions.
4. **Security Barrier**: In CSR/hybrid modes, the splash masks the screen while `authGuard` checks session validity, ensuring zero unauthorized layout flashing.

### Phase 2 Implementation Rules (Component Data Skeletons)

1. **Location**: Inside feature component templates (e.g. `dashboard-metrics.component.html`, `user-table.component.html`).
2. **Dimension Parity**: Skeleton widths and heights must match actual data containers to guarantee `CLS: 0.000`.
3. **Non-Blocking Shell**: Navbars, sidebars, and tab headers must remain rendered and interactive while skeletons animate.

## Comparison Matrix

| Lifecycle Stage | Phase 1: Pre-Bootstrap | Phase 2: Post-Bootstrap |
| :--- | :--- | :--- |
| **Pattern** | **Splash Screen** | **Skeleton Screen** |
| **Host File** | `index.html` | Feature Component Template |
| **Lifespan** | 0ms until bundle bootstrap & guard validation | Component mount until API response |
| **Scope** | Full Viewport | Local / Granular Container |
| **Primary Goal** | Anti-White Screen, Anti-FOUC, Anti-FOUAC | Spatial Stability (CLS: 0), Perceived Speed |
| **Text Requirement** | `"Loading..."` | None (pure shape shimmer) |

## Anti-Patterns to Avoid

- ❌ Placing skeleton layouts in static `index.html` before client authentication runs.
- ❌ Using full-screen modal splash loaders during background table filtering or pagination.
- ❌ Using different splash text per micro-frontend (e.g. `Loading Dashboard...`), which causes visual text jumps on cross-port redirects.
