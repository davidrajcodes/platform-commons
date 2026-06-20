# PROMPTS.md — AI Prompts Used

This file documents every meaningful prompt used during development of Platform Commons.

---

## Prompt 1 — Project Scaffolding
**Tool:** Claude  
**Prompt:** "Create an Angular 19 monolithic project from scratch based on the given assignment requirements. Use standalone components, signals, inject(), and OnPush where appropriate."  
**Decision made differently:** AI suggested using NgModules for feature grouping. I kept it standalone-only with loadComponent() lazy routes instead — no NgModule anywhere.

---

## Prompt 2 — Auth Service
**Tool:** Claude  
**Prompt:** "Build an AuthService using Angular signals that stores a mock JWT in sessionStorage, rehydrates on page reload, and exposes currentUser, role, and isAuthenticated as computed signals."  
**Decision made differently:** AI suggested using BehaviorSubject for backwards compatibility. I chose pure signals since Angular 19 supports them natively and avoids the subscribe boilerplate.

---

## Prompt 3 — CanActivate Guards
**Tool:** Claude  
**Prompt:** "Write authGuard and adminGuard as CanActivateFn functions using inject(). The auth guard should append returnUrl to the redirect. The admin guard should redirect non-admins to /shop."  
**Decision made differently:** AI used constructor injection in a class-based guard. I converted to functional guards with inject() as required by the spec.

---

## Prompt 4 — Product Service with Shared WebSocket Simulation
**Tool:** Claude  
**Prompt:** "Create a ProductService that fetches from dummyjson.com, maintains a signal-based product cache, and simulates a WebSocket stock update stream using interval + Subject. The stream must be shared — not duplicated per component."  
**Decision made differently:** AI created a separate StockService. I merged it into ProductService to keep a single source of truth and avoid the circular dependency that would have resulted.

---

## Prompt 5 — Dynamic Form Renderer
**Tool:** Claude  
**Prompt:** "Build a DynamicFormComponent that accepts a FormFieldConfig[] and FormGroup as inputs. Support visibleWhen predicates for conditional field visibility. No knowledge of which step or module is using it."  
**Decision made differently:** AI added a step prop to the component. I removed it entirely — the component is a pure presenter and must not know its context.

---

## Prompt 6 — Luhn ControlValueAccessor
**Tool:** Claude  
**Prompt:** "Create a CardInputComponent that implements ControlValueAccessor and Validator. It should format the card number in groups of 4 as the user types and validate using the Luhn algorithm."  
**Decision made differently:** AI put the Luhn logic inside the component. I extracted it to luhn.validator.ts so it can be unit-tested independently and reused as a standalone ValidatorFn.

---

## Prompt 7 — Checkout Guard (checkoutStepGuard)
**Tool:** Claude  
**Prompt:** "Write a CanActivateFn that prevents deep-linking to checkout step 2 or 3 without completing the prior step. Empty cart at step 1 should redirect to /shop."  
**Decision made differently:** AI stored step state in localStorage. I used a singleton CheckoutStateService with signals — it resets on order completion and doesn't persist stale step data across sessions.

---

## Prompt 8 — Admin Orders Side Panel
**Tool:** Claude  
**Prompt:** "Build the admin orders view with a sortable table, status + date-range filters, and a slide-in side panel for order detail. Status updates must reflect immediately in the table via shared signal state."  
**Decision made differently:** AI opened a modal (full overlay). I used a slide-in side panel (right-aligned drawer) so the user can see the table context while reviewing an order.

---

## Prompt 9 — Performance Optimisations
**Tool:** Claude  
**Prompt:** "List 5 performance decisions for the /shop module with before/after evidence."  
**Decision made differently:** AI included SSR as a decision. I excluded it since this is a SPA without server-side rendering configured, and including it would be misleading.
