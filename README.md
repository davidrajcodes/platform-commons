# Platform Commons — Angular 19 Monolithic App

A full-stack frontend application built with **Angular 19** (standalone components, signals, inject()) covering authentication, admin panel, and user storefront.

## ✨ Demo link

```bash
https://davidrajcodes.github.io/platform-commons
```

## 🚀 Quick Start

```bash
npm install
npm start          # http://localhost:4200
npm test           # Karma unit tests
npm run build      # Production build
```

## 🔑 Demo Credentials

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin1@platform.com    | admin123   |
| Admin | admin2@platform.com    | 123456     |
| User  | user1@platform.com     | password   |
| User  | user2@platform.com     | userpass   |

## 🗂 Project Structure

```
src/app/
├── core/
│   ├── guards/          # Auth, Admin, CheckoutStep guards + Product resolver
│   ├── models/          # TypeScript interfaces (User, Product, Order, Cart)
│   └── services/        # AuthService, ProductService, OrderService,
│                        # CartService, CheckoutStateService, ToastService
├── features/
│   ├── auth/            # LoginComponent (OnPush, reactive form, skeleton)
│   ├── admin/           # AdminShellComponent + lazy-loaded sub-routes
│   │   ├── products/    # CRUD table, debounced search, optimistic delete
│   │   ├── orders/      # Sortable table, date filter, side-panel detail
│   │   └── analytics/   # KPI cards, status bars, revenue chart
│   └── shop/            # ShopShellComponent + lazy-loaded sub-routes
│       ├── catalogue/   # Grid, multi-filter, URL-synced params, LCP/CLS observer
│       ├── product-detail/ # Route resolver, related products
│       ├── checkout/    # 3-step flow, dynamic form, Luhn CVA, guard
│       └── order-confirmation/
└── shared/
    ├── components/      # DynamicFormComponent, ToastContainerComponent
    └── pipes/           # AppCurrencyPipe (pure), luhnValidator
```

## 🏗 Architecture Decisions

### 1. Standalone Components Only
No NgModules anywhere. Every component uses `standalone: true` and imports what it needs directly. This enables tree-shaking at the component level and makes each file self-documenting.

### 2. Signal-Based State (Angular Signals)
All services expose `signal()` / `computed()` instead of BehaviorSubject chains. This eliminates manual subscribe/unsubscribe in most components. `AuthService`, `CartService`, `OrderService`, and `ProductService` all use signal stores.

### 3. `inject()` Over Constructor Injection
Every injection uses `inject()` in the field initializer — no constructor parameters anywhere. This aligns with Angular's direction for zoneless and enables better tree-shaking.

### 4. `takeUntilDestroyed(destroyRef)` For Cleanup
All `subscribe()` calls use `takeUntilDestroyed(this.destroyRef)` for automatic cleanup. No `ngOnDestroy` boilerplate.

### 5. OnPush Change Detection on Hot Components
`LoginComponent`, `CatalogueComponent`, and `ProductCardComponent` use `ChangeDetectionStrategy.OnPush`. These components are either form-heavy (benefit from skipping subtree checks) or rendered many times in a list (card grid). Each has a comment explaining the choice.

### 6. Shared WebSocket Stream (ProductService)
The simulated stock update stream lives in `ProductService.stockUpdates$` — a single `Subject`. Both `AdminProductsComponent` and `ProductCardComponent` read from the same stream and the same `productCache` signal. No duplicate polling.

### 7. Route-Level Lazy Loading
Every feature route uses `loadComponent()`. The shop module additionally uses `@defer` in the shell for an extra loading boundary.

### 8. Dynamic Form Renderer (Shared)
`DynamicFormComponent` is a pure presenter — it knows nothing about checkout steps or admin forms. It accepts `fields: FormFieldConfig[]` and `formGroup: FormGroup` as inputs and handles `visibleWhen` predicates reactively.

### 9. Luhn ControlValueAccessor
`CardInputComponent` implements both `ControlValueAccessor` and `Validator` via `NG_VALUE_ACCESSOR` + `NG_VALIDATORS`. It integrates seamlessly into the reactive `paymentForm` without any parent-level ceremony.

### 10. URL-Synced Filters
Catalogue filters (search, category, price, inStock) are reflected in the URL via `router.navigate([], { queryParams })`. Deep-linking preserves filter state on refresh.

## Known Limitations
- `dummyjson.com` API does not support multi-category filtering server-side; multi-select categories fall back to client-side filtering.
- Mock auth uses a deterministic hash table (not real bcrypt) for demo purposes.
- No real WebSocket — simulated with `interval` + `Subject`.
