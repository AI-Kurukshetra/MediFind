# DECISIONS

## 2026-03-14 - Initial Data Model and Security Baseline
- Adopted Supabase/Postgres as canonical datastore with one migration-first workflow.
- Used `public.users` keyed to `auth.users.id` to align domain entity naming while preserving Supabase Auth ownership.
- Enabled RLS on all core tables from day one.
- Exposed public read access only where needed for medicine discovery (`pharmacies`, `medicines`, `inventory` available rows).
- Added server-side SQL function `search_medicines_nearby` for indexed medicine search + distance sorting.
- Added both `lower(name)` B-tree and trigram indexes on medicines to support fast case-insensitive search at scale.

## 2026-03-14 - Search API Contract
- Implemented medicine search as `GET /api/medicines/search` with query params: `query`, `latitude`, `longitude`, optional `radiusKm`.
- API validates input with Zod before hitting database RPC.
- API delegates ranking/filtering to SQL function for consistent server-side performance behavior.

## 2026-03-14 - Inventory API Contract
- Implemented inventory management endpoints under `/api/pharmacies/{pharmacyId}/inventory`.
- Used bearer-token Supabase request client so RLS policies remain the authorization source.
- Added dedicated owner-select policy on `inventory` to allow pharmacy owners to view unavailable/out-of-stock inventory from dashboard flows.

## 2026-03-14 - Auth and Profile Setup Contract
- Implemented auth endpoints for sign-up, sign-in, and sign-out with Supabase Auth.
- Implemented profile endpoint `GET/PATCH /api/users/me` using bearer-token authorization and RLS-protected `public.users` access.
- Added DB trigger on `auth.users` inserts to automatically create/update corresponding `public.users` profile records using sign-up metadata.

## 2026-03-14 - Search UI State Handling
- Search page uses explicit UI states for loading, API error, and empty results to keep medicine discovery feedback immediate.
- Added route-level `loading.tsx` and `error.tsx` under `app/search` to ensure resilient UX beyond component-level fetch states.

## 2026-03-14 - Dashboard Auth Handling
- Dashboard inventory UI currently accepts a bearer access token via form input to call owner-protected inventory APIs.
- This preserves backend RLS constraints without adding cookie-based auth middleware yet; cookie/session integration remains a follow-up task.

## 2026-03-14 - Pharmacy Auth + Dashboard Session UX
- Upgraded from manual dashboard token input to a pharmacy-owner authentication workflow on `/sign-in` backed by Supabase Auth APIs.
- Registration now combines owner sign-up and pharmacy profile creation before redirecting to dashboard.
- Dashboard bootstraps from local `medifind_pharmacy_session`; if pharmacy context is missing, it resolves via `/api/pharmacies/me` and rehydrates session.
- Access failure or missing session now redirects to `/sign-in`, keeping owner-only inventory actions aligned with RLS-protected API usage.

## 2026-03-14 - Medicine Catalog Onboarding from Dashboard
- Manual medicine UUID entry is no longer the primary workflow for pharmacies.
- Added lookup endpoint for medicine suggestions and a create endpoint for new medicine catalog records from dashboard.
- Medicine creation endpoint uses service-role client server-side but enforces requester checks (`pharmacy_owner` role + linked pharmacy) before write operations.
- Dashboard inventory add flow now depends on selected/created medicine context, then submits inventory write with resolved `medicineId`.

## 2026-03-14 - Order Workflow API
- Implemented `POST /api/orders` with support for both `reservation` and `delivery` order types.
- Delivery orders create both `orders` and `delivery_requests`; delivery insert failure triggers best-effort rollback of the parent order.
- Implemented `GET /api/orders` for authenticated participants with optional `orderType` and `status` filters.
- Implemented `PATCH` endpoints for order status (`/api/orders/{orderId}`) and delivery request status (`/api/delivery-requests/{deliveryRequestId}`).

## 2026-03-14 - Prescription Storage Workflow
- Implemented `POST /api/prescriptions/upload-url` to generate signed upload URLs in a private `prescriptions` bucket.
- Prescription files are namespaced by authenticated user ID in storage paths.
- Implemented `GET/POST /api/prescriptions` and `PATCH /api/prescriptions/{prescriptionId}` for record lifecycle.
- Added pharmacy-owner update policy for prescriptions tied to their pharmacy orders, enabling verification actions.

## 2026-03-14 - Stock Alert Workflow
- Added `stock_alert_subscriptions` table to persist user medicine alert subscriptions with location + radius.
- Added inventory trigger to generate `notifications` when subscribed medicines become available in-range.
- Added notification APIs for listing and mark-as-read, plus subscription APIs for create/list/delete.
- Added a 12-hour throttle window (`last_notified_at`) to reduce repeated stock notifications for the same subscription.

## 2026-03-14 - Unit Test Baseline
- Added Vitest alias resolution for `@/*` imports in test runtime.
- Added unit tests for key Zod schemas (search, auth, orders), medicine search route success/failure behavior, and Supabase helper/auth utilities.
- Test execution is currently environment-blocked until `pnpm` is available.

## 2026-03-14 - E2E Test Strategy
- Added Playwright e2e coverage for auth route rendering, search UI behavior, and dashboard inventory interactions.
- Used API route interception for deterministic e2e behavior in flows where backend/state setup is not yet automated in fixtures.
- Added delivery workflow contract checks via browser-side API calls with intercepted responses.

## 2026-03-14 - Test Execution Stability
- Switched Playwright `webServer` command from `pnpm dev` to `pnpm build && pnpm start` to avoid Turbopack instability in CI-like test runs.
- Kept inventory e2e assertions focused on stable, user-visible state to reduce transient-message flakiness.
- Standardized on `corepack pnpm` commands in this environment and installed Playwright Chromium locally for e2e execution.

## 2026-03-14 - UI Redesign: Search Page
- Replaced raw latitude/longitude inputs with Geolocation API integration ("Use my location" button) to reduce friction for location-aware searches.
- Added medicine name autocomplete using existing `/api/medicines/options` endpoint with 300ms debounce to improve discovery.
- Used framer-motion stagger animations on search results to convey dynamism without harming perceived performance.
- Chose custom Dialog component over headless-ui/radix to avoid additional dependencies; implemented focus trap and Escape handling manually.
- Adopted bottom-sheet pattern on mobile (rounded-t-2xl, full-width) for delivery modal to match native mobile UX patterns.

## 2026-03-14 - UI Redesign: Dashboard
- Replaced inline error/success card messages with a global toast notification system to reduce visual clutter and keep user focus on the inventory workflow.
- Built Toggle switch component internally rather than importing a toggle library to maintain the minimal dependency footprint.
- Used collapsible sections (AnimatePresence + motion.div) for the "Create new medicine" form to keep the primary add-inventory flow clean.
- Dashboard header is now a separate sticky section outside `saas-page` for full-width visual weight.

## 2026-03-14 - Auth Page Redesign
- Adopted split-screen layout pattern common in modern SaaS apps: left panel for brand storytelling, right panel for auth forms.
- Left brand panel is hidden on mobile (lg:hidden) to keep the form front-and-center on small screens. A compact mobile brand header replaces it.
- Used framer-motion AnimatePresence with `mode="wait"` for smooth sign-in/register tab transitions without layout jumps.
- Added password visibility toggle (Eye/EyeOff) for better UX on the sign-in and register forms.
- Replaced inline error/success cards with global toast notifications to reduce visual noise in the form area.
- Added "Detect location" button using Geolocation API for pharmacy lat/lng registration, reducing friction vs raw coordinate entry.
- Pharmacy details section uses collapsible AnimatePresence panel to keep the registration form less overwhelming initially.

## 2026-03-14 - Global Navigation & Toast Architecture
- Created a client-side Navbar component using `usePathname()` for active route detection, placed in `app/layout.tsx`.
- Toast system uses React Context + Provider pattern to allow any component to trigger notifications without prop drilling.
- Toast auto-dismisses after 4 seconds with manual dismiss available; animations use framer-motion for consistent spring physics.

## 2026-03-14 - Security and Performance Hardening Pass
- Enforced participant-based status transitions:
  - order/delivery request owners can only cancel their own records,
  - pharmacy owners can manage operational transitions.
- Restricted prescription review/verification state updates to `pharmacy_owner` or `admin` roles.
- Added list-size caps for heavy endpoints to reduce unbounded response payloads.
- Replaced fragile delivery creation rollback delete with status cancellation fallback to align with existing RLS policy constraints.
