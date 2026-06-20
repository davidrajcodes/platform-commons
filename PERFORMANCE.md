# PERFORMANCE.md — Platform Commons

Five performance decisions made for the `/shop` module, each with rationale and synthetic evidence.

---

## 1. `OnPush` Change Detection on `ProductCardComponent`

**Decision:** `ProductCardComponent` uses `ChangeDetectionStrategy.OnPush`.

**Rationale:** The catalogue grid renders up to 12 cards per page. Without OnPush, every zone tick (mouse move, timer, stock update) triggers change detection across all 12 card subtrees. With OnPush, Angular only checks a card when its `@Input()` reference changes or a signal read inside it changes.

**Evidence (synthetic):** Profiling with Chrome DevTools shows ~14ms for 12-card grid check without OnPush vs ~2ms with OnPush on stock badge update (signal read is granular — only the affected card re-renders).

---

## 2. Route-Level Lazy Loading with `loadComponent()`

**Decision:** Every feature route uses `loadComponent()` — no eagerly loaded feature code.

**Rationale:** The initial bundle only contains the shell + auth code. Admin panel (~60KB) and shop module (~80KB) are only downloaded when navigated to.

**Evidence:** `ng build --stats-json` shows initial bundle ~42KB vs total ~180KB. A user who only visits `/login` downloads 77% less JS.

---

## 3. `@defer` in `ShopShellComponent`

**Decision:** `<router-outlet>` inside the shop shell is wrapped in `@defer (on viewport)`.

**Rationale:** Adds a meaningful loading boundary at the route level. The placeholder renders immediately while the route component chunk loads, preventing layout shift. Also defers third-party code used only within shop routes.

**Evidence:** LCP drops by ~120ms on a throttled 3G connection because the shell paints instantly while the catalogue component loads in the background.

---

## 4. `PerformanceObserver` on Catalogue Route

**Decision:** Attach a `PerformanceObserver` for `largest-contentful-paint` and `layout-shift` on the catalogue component's `ngOnInit`.

**Rationale:** Continuous monitoring in production catches regressions (e.g., an image loading change that shifts CLS). The observer logs to console in dev and can be wired to an analytics endpoint in production without changing component logic.

**Before:** No visibility into real-user LCP — only lab Lighthouse scores.
**After:** Console output on every catalogue load: `[Perf] LCP: 1240ms`, `[Perf] CLS contribution: 0.0012`.

---

## 5. `lazy` Image Loading and Aspect-Ratio CSS

**Decision:** All product card images use `loading="lazy"` and the image wrapper uses `padding-top: 75%` (aspect-ratio trick) to reserve space.

**Rationale:** `loading="lazy"` defers off-screen images until near-viewport. The CSS aspect ratio prevents CLS — the browser allocates space before the image loads, so no layout shift occurs when images arrive.

**Evidence:** Without aspect-ratio reservation, CLS score measured 0.18 (poor). With it, CLS = 0.003 (excellent). Lighthouse CLS metric improved from 0.18 → 0.003.

---

## Additional Optimisations

- **Pure pipe `AppCurrencyPipe`** — marked `pure: true` (default). Angular only re-runs the pipe when the value reference changes, not on every CD cycle.
- **`trackBy` on all `@for` loops** — prevents full DOM re-renders when list data updates. All `@for` blocks use `track item.id` or `track item`.
- **Shared stock stream** — single `interval` in `ProductService` vs one per component eliminates N timer subscriptions.
- **`withComponentInputBinding()`** on router — resolvers inject directly via `@Input()`, avoiding an extra `ActivatedRoute.data.subscribe()` per detail page.
