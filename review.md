# Carshes Frontend — Code Review Report

| | |
|---|---|
| **Date** | 2026-10-30 |
| **Scope** | `frontend/` — `src/**` and `e2e/**` (≈ 17 k lines incl. tests), build / lint / test configuration |
| **Baseline** | branch `feature/check` at `10d536d` **plus the uncommitted working tree** (36 modified files, new `e2e/`, `playwright.config.js`, `bookingSchema.spec.js`) |
| **Reference** | `implementation-plan.md` (all 7 phases marked done), `CLAUDE.md` conventions, `backend/src` as source of truth for the API contract |
| **Method** | Automated gates run locally; every source and test file read by area (core, user screens, admin console, styling/config/e2e); each finding re-checked against the code; contrast ratios computed with the WCAG formula used in `contrast.spec.js` |

---

## 1. Executive summary

The frontend is in **good shape and close to release quality**. Architecture boundaries are respected without exception, all 23 endpoints are wired correctly against the backend, the Options-API / design-token / helper conventions are followed everywhere (repo-wide greps returned zero violations), and every automated gate passes: lint, Prettier, 465 unit tests, the production build and 35 Playwright end-to-end checks (layout + axe at 375 / 1024 / 1440 px, journeys, endpoint coverage).

The review nevertheless found **3 High** and **15 Medium** issues that the current tests do not catch. They cluster in three areas:

1. **Async ordering.** Several actions and components accept late responses. The worst case is that the quick-book modal can **book a different car than the one shown** (H2). The car page can also get stuck on its skeleton (M1), and booking data can survive sign-out (M2).
2. **Admin role edge cases.** **Admins cannot book a car** from the fleet or car page: every attempt returns 400 (H1). Several console flows also have stale defaults or a false "all clear" (M8–M12).
3. **Accessibility details that axe does not reach.** Red danger buttons have **1.66 : 1** text contrast (H3), input borders fail the 3 : 1 non-text rule, two selects and one dialog have no accessible name, and focus is lost after booking. The e2e axe scan never opens modals or popconfirms, so none of these were caught.

**Recommendation:** fix H1–H3 and the Medium items marked ★ in §9 before merging `feature/check`. The rest can be scheduled as follow-up work.

### Scorecard

| Dimension | Rating | Notes |
|---|---|---|
| Coding standards & conventions | ★★★★★ | Zero violations in repo-wide greps (Options API, tokens, helpers, `notify`, `geo`, no hard-coded `/api/v2`) |
| Architectural boundaries | ★★★★★ | Components → Vuex → `api/*` → shared `http`; IDOR-safe "my data" calls; strict-mode-safe store |
| Functional correctness | ★★★☆☆ | 1 High role bug, several race conditions and stale-state bugs |
| Spec / plan compliance | ★★★★☆ | All endpoints and Q1–Q16 handled; small deviations (§5) |
| Validation | ★★★★☆ | Zod schemas mirror Mongoose limits; one ordering gap in the confirm-password rule, a few untested schemas |
| Accessibility | ★★★☆☆ | Strong foundations, but 1 High contrast bug and several naming/focus gaps outside the axe-scanned states |
| Test coverage | ★★★★☆ | Broad (39 unit files + e2e), but no coverage tooling and the race/error paths are untested |
| Performance | ★★★★☆ | Lazy routes, lazy Leaflet, caches, visibility-gated polling; minor O(n·m) joins and map re-fits |

---

## 2. Verification evidence

| Gate (run in `frontend/`) | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run format:check` | ✅ all files formatted |
| `npm test` (Vitest) | ✅ **39 files, 465 tests passed** (169 s) |
| `npm run build` | ✅ built in 27 s, no chunk-size warnings. Largest chunks: `AdminView` 301 kB (87 kB gz, lazy), entry `index` 207 kB (67 kB gz), `leaflet` 149 kB (43 kB gz, lazy) |
| `npx playwright test` (Docker stack up) | ✅ **35 / 35 passed** (1.6 min): 30 layout + axe checks, endpoint coverage, 4 journeys |
| Coverage report | ⚠️ not available. `@vitest/coverage-v8` is not installed and there is no `test.coverage` config (see L-T1) |

> Note: the e2e endpoint check runs E16 / E17, which change matching cars in the local database. Re-seed (`npm run seed:cars` in `backend/`) to reset it.

---

## 3. Findings

Severity scale: **High** = wrong behaviour users will hit or an AA failure on a main flow · **Medium** = a real defect in a less common path, or an a11y / robustness gap · **Low** = minor, cosmetic or defensive · **Info** = observation.

### 3.1 High

#### H1 — Admins cannot book a car from Fleet or Car details (always 400)
- **Where:** `src/store/modules/bookings.js:118-123`, together with `backend/src/controllers/booking.controller.js:30` and `backend/src/models/booking.model.js:7-11`.
- **Problem:** the user payload is whitelisted to `{ carId, startDate, startFuelLevel, startMileage }`, without `userId`. The backend adds `userId` only for non-admins (`isAdmin ? req.body : { ...req.body, userId: req.user._id }`), and `Booking.userId` is required.
- **Scenario:** `/fleet` and `/cars/:id` are open to admins, and "Book now" is shown to them. An admin passes every pre-check, then `POST /bookings` returns **400 "Invalid input data. User is required"**.
- **Fix:** add `userId: rootState.auth.user._id` to the payload. The backend overwrites it for users anyway, so Q4 still holds. Alternatively, hide booking for admins. Add a store test with an admin session.

#### H2 — Quick-book modal can book a different car than the one displayed
- **Where:** `src/components/cars/QuickBookModal.vue:77-94`.
- **Problem:** `check()` sets `freshCar` / `block` / `isChecking` from whichever `checkBookable` response arrives, even one from an earlier opening of the modal. `confirm()` then books `this.shown._id`, and `shown = freshCar ?? car`.
- **Scenario:** on a slow network the user opens "Book now" for car A, cancels, then opens it for car B. A's late response fills the B modal with A's data and enables Confirm, so the user books **car A** while looking at a dialog opened for B. `@after-close="reset"` runs before the late response and does not help.
- **Fix:** keep a request sequence (`const seq = ++this.checkSeq`) and ignore responses unless `seq === this.checkSeq && this.open && car._id === this.car._id`. In `confirm()`, book `this.car._id`. Add a test that reopens the modal while a check is pending.

#### H3 — Danger buttons have dark text on red (contrast 1.66 : 1)
- **Where:** `src/theme/antd.js:30` (`colorTextLightSolid: 'primary-foreground'`).
- **Problem:** Ant Design uses `colorTextLightSolid` for text on **every** solid fill, not only primary buttons. In light mode that puts `primary-foreground` (dark brown) on `destructive` at **1.66 : 1**, on `info` at 1.55 and on `success` at 1.62. AA requires 4.5.
- **Affected UI:** the "Delete" button in `DeleteTripModal.vue:95`, and the OK buttons of the danger popconfirms in `AdminFleetTable.vue:202`, `AdminUsersTable.vue:188` and `MaintenanceActions.vue:96`.
- **Why it was missed:** `contrast.spec.js` tests tokens only on background surfaces, and the e2e axe scans never open these dialogs.
- **Fix:** map `colorTextLightSolid` to a light token (e.g. `destructive-foreground`) and set the primary-button text separately (`components.Button.primaryColor = primary-foreground`). Add "foreground on fill" pairs to `contrast.spec.js`.

### 3.2 Medium

| # | Finding | Where | Scenario / impact | Suggested fix |
|---|---|---|---|---|
| **M1** ★ | `carDetails/fetchCar` never checks that a response still matches the requested id | `store/modules/carDetails.js:40-61` | `/cars/A` → `/cars/B` (same component, `id` watcher). A's late response, or a silent poll, overwrites B. `shown` becomes null with `isLoading=false`, so the **skeleton stays forever**; a late error for A shows "not in the fleet" on B. | Track `latestId` / request seq and drop stale results; test with two requests that resolve in reverse order |
| **M2** ★ | A `fetchMine` in flight survives sign-out and refills the cache | `store/modules/bookings.js:78-94`, `store/index.js:11-20` | User A logs out while My Trips loads. User B signs in within 60 s and `fetchMine()` (no force) returns **A's bookings**, so `openBooking` is wrong. `admin/trips` and `admin/users` follow the same pattern. | Session generation counter bumped on `RESET`, or compare `rootState.auth.token` before and after the await |
| **M3** ★ | HeaderSearch debounce can pull the user back to `/fleet` | `components/layout/HeaderSearch.vue:39-41` | Type "bmw" on `/fleet`, click a car's "Details" within 300 ms. The car page opens, then the timer calls `router.replace({ name: 'fleet' })`. | Re-check `this.isOnFleet` inside the timeout, or clear the timer when `$route.name` changes |
| **M4** ★ | Booking-confirmed modal has no accessible name, and focus is lost on close | `components/booking/BookingConfirmedModal.vue:47`, `BookingPanel.vue` | The dialog has no `title` / `aria-labelledby`. After booking, the CTA becomes disabled (car now `in_use`), so Ant's focus return fails and focus lands on `<body>`. Plan §8.6 requires focus to return. | Add `aria-labelledby` pointing at the heading; in `afterClose`, focus the panel (`tabindex="-1"`) or the `h1` |
| **M5** ★ | User / Car selects in "New booking" have no accessible name | `components/admin/BookingFormModal.vue:206, 225` | They rely on `aria-label`, which `a-select` drops (gotcha 21), and the `a-form-item`s have no `html-for`. Screen readers hear an unnamed combobox. | Use the `html-for` + `id` pattern from `VehicleFormModal`, or a `sr-only` `<label>` wrapper |
| **M6** | Input borders fail WCAG 1.4.11 (non-text contrast) | `styles/design-system.css:41` (`--input`, Ant `colorBorder`) | `input` on `surface` = **1.65 : 1** (`border` = 2.06). Form fields are hard to find for low-vision users. | Darken `--input` to ≥ 3 : 1 on `surface`; add the pair to `contrast.spec.js` |
| **M7** | Fuel level hidden from assistive tech on fleet cards | `components/common/CarPlaceholder.vue:43-55`, `CarCard.vue:67-76` | The wrapper has `role="img"`, so the slotted fuel chip ("Fuel level 80 %") becomes presentational and is dropped from the accessibility tree. | Put `role="img"` / `aria-label` on an inner element; render the slot as a sibling |
| **M8** | Long user names no longer truncate in the header *(working-tree change)* | `components/layout/UserMenu.vue:43` | `sm:not-sr-only` sets `overflow: visible` and `white-space: normal` with `!important` after `truncate`, so from `sm` up long names wrap or overflow the button. | Use `sr-only sm:not-sr-only sm:truncate` or a separate visible span plus a `sr-only` span |
| **M9** | Fleet `?car=` focus resets the admin's filters on every data refresh | `components/admin/AdminFleetSection.vue:87-89, 119-133` | `highlightId` clears after 3 s and `?car=` stays in the URL, so every new `cars` array (the 60 s refresh, upserts) re-runs `resetFilters()` + `setFilters({ q: vin })`. The admin's filtering keeps snapping back. | Focus once per `focusId`, or drop `car` from the query after focusing (as Trips / Users do) |
| **M10** | A failed list reload after "New booking" invites a duplicate booking | `store/modules/admin/trips.js:123-127` | The booking is saved, then `fetchTrips` fails and re-throws. The modal shows an error and stays open, the admin clicks Create again, and a **duplicate booking** is created. `createCar` (`admin/fleet.js:84`) has the same pattern. | Catch the reload error (as `refreshCars` does) or report "Saved, list not refreshed" |
| **M11** | Admin widgets show a false "all clear" when E14 / E15 fail | `store/modules/admin/fleet.js:21,59`, `LowFuelAlerts.vue`, `ReservedCardsWidget.vue` | `widgetsError` is stored but never rendered. On failure the alert widget shows a green "No low-fuel cars in trips". | Render `widgetsError` with a Retry button in both widgets |
| **M12** | "New booking" default start time goes stale | `components/admin/BookingFormModal.vue:60-70` | `initialValues` is a computed that depends only on `trip` (always `null` in create mode), so `toPickerValue(new Date())` is cached from the first open. Reopening 2 h later pre-fills a start 2 h in the past, and the trip duration is inflated. | Build the initial values in a method or `data`, refreshed when the modal opens |
| **M13** | Reserved-cars widget: duplicate `v-for` keys and past drivers listed | `components/admin/ReservedCardsWidget.vue:69`; backend `car.service.js` (E15) | The E15 aggregation unwinds **all** bookings and cards (including completed bookings and deleted cards), so one VIN appears several times. `:key="row.vin"` duplicates, and past bookers show as "driver". | De-duplicate rows and key by index + VIN; record the backend gap (E15 should match only the open booking and non-deleted cards) |
| **M14** | Main e2e journeys can pass by skipping, and leak state on failure | `e2e/journeys.spec.js:69, 161, 75-110` | `api-coverage` runs first and E16 sends cars to service on every run, so the free fleet shrinks until the journeys `test.skip` silently. A failure before `bookingId` is set leaves a car `in_use`, because cleanup DELETEs the booking and DELETE keeps the car status (Q8). | Let the journey create its own car; look up the booking right after confirming; complete it (E22) in cleanup rather than delete; fail instead of skip in CI |
| **M15** | Map snaps back to its fitted view on every 30 s poll | `components/common/MapView.vue:53-64, 137` | Each silent `fetchCar` or `upsertCar` produces new marker objects, and the deep watcher calls `fitToContent()`. A user panning the car's location map is pulled back every 30 s. The fleet map popup can also go empty when its car drops out of the filter. | Re-fit only on first render or when marker ids / coordinates change; close the popup when its marker disappears |

### 3.3 Low

| # | Finding | Where |
|---|---|---|
| L1 | `bootstrap` clears the stored token on **any** error, including network errors and 5xx, so a remembered user is logged out by a backend restart or offline start | `store/modules/auth.js:117-120` |
| L2 | `fetchCars({ force: true })` returns the request already in flight, which may predate the mutation; the list stays stale for up to 30 s | `store/modules/cars.js` (shared-promise path) |
| L3 | "Book now" uses the client clock (`new Date()`); a browser clock that is fast makes the backend treat the start as future, so the car becomes `reserved` and the trip shows as Upcoming | `store/modules/bookings.js:120` |
| L4 | `fetchMine`, `admin/trips/fetchTrips` and `admin/users/fetchUsers` have no de-dup or ordering, so an overlapping 60 s refresh can overwrite fresher data | respective modules |
| L5 | Q16 (no self-delete) is enforced only in the UI (`AdminUsersTable.vue:185`); `deleteUser` has no guard | `store/modules/admin/users.js:95` |
| L6 | "Retry car update" after completing a trip on a **soft-deleted** car always fails with 404 | `store/modules/admin/trips.js:147-156` |
| L7 | `formatDistance(995)` prints "1000 m" instead of "1.0 km" (rounding happens after the unit check) | `utils/format.js:52` |
| L8 | "Also mark the car as Available" is offered for **completed** bookings too, and can free a car that is now in another trip | `components/admin/DeleteTripModal.vue:89` |
| L9 | Maintenance previews count cars already `in_service` or already at the depot, so the preview number is higher than `modifiedCount` | `utils/admin.js:103-116` |
| L10 | Sign-out does not reset admin `filters` or `insights.date`; `insights.date` also never rolls over at midnight | `store/index.js:17-19`, `admin/insights.js` |
| L11 | Plan §11.1 requires `?date=` in the URL; the selected date lives only in Vuex | `views/AdminView.vue` |
| L12 | "Complete" on an **Upcoming** booking opens with a validation error, because the default end (now) is before the start | `components/admin/CompleteTripModal.vue` |
| L13 | A `?user=` focus on a row past page 1 is highlighted but not visible (uncontrolled pagination), and the `<tr>` highlight may be hidden behind cell backgrounds | `components/admin/AdminUsersTable.vue` |
| L14 | No `<h1>` on Not Found or on the car page's 404 / error / skeleton states (`a-result` titles are `div`s); `layout.spec.js:96` exempts Not Found instead of fixing it | `views/NotFoundView.vue:8`, `views/CarDetailsView.vue` |
| L15 | Ant icons inside labelled buttons and inputs are announced ("Sign In arrow-right"); add `aria-hidden="true"` as `BookingPanel` already does | `SignInForm.vue`, `RegisterForm.vue`, `UserMenu.vue`, `MyProfileView.vue`, `FleetHeader.vue`, `FleetFilters.vue` |
| L16 | `id="fleet-min-fuel"` is duplicated once the mobile filter drawer has been opened, so the slider label points at the hidden copy | `components/cars/FleetFilterControls.vue:74, 85` |
| L17 | `aria-label` on plain `<span>`s is ignored (count pills); use `sr-only` text | `PillGroup.vue`, `LowFuelAlerts.vue`, `AdminUsersTable.vue` |
| L18 | The mobile admin `a-drawer` has no title or `aria-label` | `layouts/AdminLayout.vue:34` |
| L19 | Map markers convey status by colour only; add the status label to the marker title | `components/common/MapView.vue`, `FleetMap.vue` |
| L20 | "Passwords do not match" appears only after every other field is valid (Zod 3 object `.refine`) | `components/auth/schemas.js:64-66` |
| L21 | The scheduled-time picker offers times beyond the 7-day limit on the last day, which `scheduleError` then rejects | `utils/schedule.js` (`disabledTimeOf`) |
| L22 | Tab title not updated when revisiting the same car (the `name` watcher isn't `immediate`); a failed manual refresh on the car page is silent; on the fleet, a failed background refresh with no matching cars shows neither empty nor error state | `views/CarDetailsView.vue`, `views/FleetView.vue` |
| L23 | Share falls back only to `navigator.clipboard`, which is missing on non-HTTPS origins | `components/cars/ShareButton.vue` |
| L24 | `colorLinkActive` is not mapped, so pressed links flash Ant's derived blue *(working-tree change)* | `theme/antd.js:31-32` |
| L25 | `CompleteTripModal.endDateOf` throws `RangeError` if `trip.startDate` is missing or invalid; the "clamp end to start" rule is duplicated between the schema and the modal | `components/admin/CompleteTripModal.vue:93-97`, `bookingSchema.js:79` |
| L26 | Dark theme (latent, no toggle in the UI yet): the soft `destructive` pill on `card` is 4.04 : 1; `--secondary-hover` is not redefined in `.dark` | `styles/design-system.css` |
| L27 | `LIBRARY_ISSUES` ignores `aria-required-attr` / `aria-valid-attr-value` on **any** `ant-select` target, which also hides app-caused select errors | `e2e/support.js:112` |
| L28 | `index.html` has no `theme-color` or `description`; `site.webmanifest` has empty `name` / `short_name` and a white `theme_color` | `index.html`, `public/site.webmanifest` |
| L29 | Delete-user popconfirm has no loading state; `deleteUser` does not refresh trips. `TripDetailsDrawer.load` has no stale-response guard | `AdminUsersTable.vue:184`, `TripDetailsDrawer.vue` |

### 3.4 Info

- CSV formula guard (`utils/csv.js:7`) does not catch a leading space before `=`; consider testing after `trimStart()`.
- E22 edits make the backend recompute the car status from that booking alone. Editing an old completed booking can free a car that is in another trip. This is a backend gap; a warning in the edit modal would help.
- Booking pickers use the browser's local time while tables show Minsk time (gotcha 18). The two disagree for admins outside Minsk.
- `contrast.spec.js:48` contains a stray backspace control character (`\bg-muted`); the `CLAUDE.md` directory tree has a stray tab before "trips".
- `text-secondary` appears only on the decorative placeholder icon (`CarPlaceholder.vue`), which is acceptable.

---

## 4. Standards & architecture compliance

Repo-wide greps over `src/` (tests excluded), each confirmed by reading the hits:

| Rule (`CLAUDE.md`) | Result |
|---|---|
| Options API only, no `<script setup>` / `setup()` / composables | ✅ 0 hits. Only `defineAsyncComponent` (FleetView, gotcha 17) and `main.js` import from `vue` |
| ESLint `component-api-style: options`, `order-in-components`, multi-word names | ✅ enforced; ⚠️ `order-in-components` is a warning and `lint` has no `--max-warnings 0` |
| Design tokens only (no palette colours, hex, `rgb()` / `hsl()` outside `design-system.css`) | ✅ 0 hits |
| `text-link` for accent text, not `text-secondary` | ✅ (one decorative icon only) |
| HTTP only via `api/*` + shared `http.js`; no hard-coded `/api/v2` | ✅ only the default in `api/http.js:10` |
| Toasts via `utils/notify.js` | ✅ no direct `message` / `notification` imports |
| Dates via `format.js` (no `toLocaleString`), coordinates via `utils/geo.js`, no `dayjs` import | ✅ 0 hits |
| Fleet filters via `router.replace` (URL is the source of truth) | ✅ |
| No `v-html`, no `console.*` | ✅ |
| Vuex strict-mode safety (state changed only in mutations) | ✅ no violations found |
| Security: `safeRedirect` blocks `//` and `/\`; "my data" endpoints never take an id from the client; CSV BOM + formula guard; token storage wrapped in try/catch | ✅ |

**Suggestion:** turn the conventions that are now kept by discipline into lint rules: `no-restricted-imports` for `axios` outside `src/api`, `dayjs`, and `message` / `notification` from `ant-design-vue`; set `vue/order-in-components` to error, or add `--max-warnings 0`.

---

## 5. Spec / implementation-plan compliance

| Area | Status | Notes |
|---|---|---|
| Endpoint matrix (§14, E1–E23) | ✅ | Method, path and body match `backend/src/routes`; static routes before `/:id`; VINs URL-encoded; `endpoints.spec.js` and `e2e/api-coverage.spec.js` assert all 23 |
| Q1–Q6 (catalogue statuses, pre-checks, whitelist, client join, read-only trips) | ✅ / ⚠️ | Implemented. H1 is an admin-only side effect of the Q4 whitelist |
| Q7 complete trip (E22 + E12, retry) | ✅ | Partial-failure retry works; see L6 for deleted cars |
| Q8 delete booking + free car | ✅ / ⚠️ | Default checked for open trips; also offered for completed ones (L8) |
| Q9–Q13 | ✅ | Re-fetch after create, read-only model fields, preview dialogs, client-side tables |
| Q14 401 handling | ✅ | Sign-in / sign-up excluded, `skipAuthRedirect` respected, message shown |
| Q16 no self-delete | ✅ / ⚠️ | UI only (L5) |
| Routes and guards (§5.2) | ✅ | Guests reach `/auth` only; admin role guard; titles set |
| Fleet (§7): 12-per-page "Show more", 8 skeletons, empty / error states, URL-synced filters, lazy map | ✅ | |
| Car details (§8): 30 s visibility-gated polling, schedule window, confirmation modal | ✅ / ⚠️ | Focus-return requirement not met (M4) |
| Admin (§11) | ✅ / ⚠️ | All 18 admin endpoints reachable; `?date=` deep link missing (L11); widget error states missing (M11) |
| Testing strategy (§15) | ✅ / ⚠️ | All listed units tested **except `KpiCard`**; Playwright suite present (plan marked it optional) |
| A11y / responsive / performance (§16) | ⚠️ | One `h1` per page except Not Found (L14); see §6 |
| Definition of Done (§19) items 1–8 | ✅ | All gates pass; items 4 and 7 have the gaps listed above |

---

## 6. Accessibility audit (WCAG 2.1 AA)

**What is done well:** a skip link and `main#main` landmark; `AuthTabs` implements the WAI-ARIA tabs pattern with arrow keys; status is always shown as text + colour (`StatusTag`, `TONES`); every icon-only button has an `aria-label` (checked by script); `a-select`s are wrapped in labels except the two in M5; there are no clickable `div`s / `span`s without keyboard support; a global `prefers-reduced-motion` rule; the axe scan runs on every screen at three widths with no serious or critical violations.

**Gaps (by WCAG criterion):**

| Criterion | Findings |
|---|---|
| 1.4.3 Contrast (text) | **H3** danger / solid-fill buttons 1.55–1.66 : 1; L26 dark-theme soft pill 4.04 : 1 (latent) |
| 1.4.11 Non-text contrast | **M6** input borders 1.65 : 1, panel borders 2.06 : 1 |
| 1.3.1 Info & relationships / 4.1.2 Name, role, value | **M5** unnamed selects; **M4** unnamed dialog; **M7** fuel text hidden inside `role="img"`; L16 duplicate id; L17 `aria-label` on `span`; L18 unnamed drawer |
| 2.4.3 Focus order | **M4** focus lost after the booking confirmation |
| 1.4.1 Use of colour | L19 map markers |
| 2.4.6 Headings and labels | L14 missing `h1`; L15 noisy icon names |

**Test gap:** axe never scans opened modals, drawers or popconfirms. Add e2e steps that open the quick-book modal, the booking confirmation, the delete-trip modal, a danger popconfirm and the vehicle form, and run `expectAccessible` on each. That would have caught H3, M4 and M5. Also extend `contrast.spec.js` to cover `surface` / `muted` backgrounds, the `/15` soft tints, "foreground on fill" pairs and `input` against `surface`.

---

## 7. Test coverage audit

**Inventory:** 39 Vitest files, 465 tests, covering every store module, the API layer (including an assertion over all 23 endpoints), router guards, every util and every view. Plus 4 Playwright specs.

**Tooling gap (L-T1):** there is no coverage provider (`@vitest/coverage-v8`) and no `test.coverage` thresholds, so coverage cannot be measured or enforced. Add the provider, a `coverage` block (`include: ['src/**']`) and starter thresholds (e.g. 80 % lines for `store/` and `utils/`).

**Untested logic** (by priority):

| Priority | Missing tests |
|---|---|
| High (would catch the findings above) | Out-of-order responses in `carDetails/fetchCar` (M1), `QuickBookModal` reopen (H2), `fetchMine` across sign-out (M2); `createBooking` by an admin (H1); `HeaderSearch` debounce after leaving `/fleet` (M3); `createTrip` with a failing reload (M10); widget error states (M11); fleet `focus` flow (M9) |
| Medium | `admin/users`: `fetchUsers`, `fetchUser`, `deleteUser`. `admin/trips`: `createTrip`, `updateTrip`, `fetchTrip`, `retryCarUpdate`, `deleteTrip` branches. `admin/fleet`: `relocateFrequent`, `fetchReserved(true)`, `fetchWidgets` error. `admin/insights`: `setDate`, `isToday`, `sparkline`. `bootstrap` on a network error; `OPEN_BOOKING` for an *active* trip |
| Medium | Schemas: `editBookingSchema` (end < start, finish mileage < start), `createBookingSchema`, `vehicleSchema` bounds, `userSchema` (`bookingSchema.spec.js` has only 2 cases) |
| Low | `KpiCard` (named in plan §15), `StartTimePicker`, `ShareButton`, `AdminSearch`, `AdminSidebar`, `LowFuelAlerts`, `TripDetailsDrawer`, `VehicleHistoryDrawer`, `CarGrid`, `FleetFilterControls`, `tripText.js`, `tripDisplay.js`, `tones.js`, `notify.js`, `adminExport.userColumns` |

**E2E gaps vs plan §15:** user editing and booking create / edit in the console; maintenance actions through the UI (only via the API); scheduled booking; UI sign-out; a non-admin redirected away from `/admin`; modal a11y scans. See M14 for flakiness and data leaks. No fixed waits (`waitForTimeout`) were found, which is good.

**Suite speed:** 169 s, of which 62 % is imports and 27 % creating jsdom per file. Vitest suggests `pool: 'vmThreads'` or a shared environment, which could cut this significantly.

---

## 8. Performance

**Good:** lazy-loaded routes with the admin console in a separate 87 kB-gz chunk; Leaflet lazy at two levels (`LazyFleetMap` plus a dynamic import inside `MapView`); Ant Design on-demand; a 30 s cars cache and 60 s bookings cache with a shared in-flight promise; 300 ms debounced search; polling and admin refresh paused while the tab is hidden; every timer, observer and map cleaned up in `beforeUnmount`; no `manualChunks` needed.

**Improvements (all minor at the current data size; revisit near the ~2 000-row limit of G7):**
- `bookings/trips` calls `cars/byId` (`Array.find`) per booking, which is O(bookings × cars). Add a `cars/byIdMap` getter and reuse it in AdminView, AdminTripsSection, AdminTripsTable, TripDetailsDrawer, BookingFormModal and `ReservedCardsWidget.carOf`, which today each build their own map or scan linearly.
- `MapView` re-renders all markers and re-fits on every deep change of `markers` (M15). Diff by id and coordinates instead.
- Fix L2 / L4 so a forced refresh doesn't return stale in-flight data, avoiding extra round-trips to correct it.

---

## 9. Prioritised action list

| Priority | Items | Effort |
|---|---|---|
| **Before merge** | H1, H2, H3; ★ M1, M2, M3, M4, M5; M8 (regression in the working tree). ✅ **Done 2026-10-30, see §12.** | ~1–1.5 days |
| **Next sprint** | M6, M7, M9–M15; L14, L15, L27; axe scans of modals; contrast-test extension; coverage tooling + thresholds; race-condition tests | ~3 days |
| **Backlog** | Remaining Low items; lint rules for conventions; byId map refactor; backend notes for E15 (open booking only) and E16 (`isDeleted` filter) | as capacity allows |
| **Process** | **T1 — align all components and store modules with the `vue-component` / `vuex-module` skills** (§11). Can run alongside the fixes above; the fixes that touch components or modules must follow the same skill rules. | ~2–3 days |

---

## 10. Strengths worth keeping

- A **clean, layered architecture** that is easy to follow: views → components → Vuex → `api/*` → one shared `http` instance, with error normalisation and a single 401 path.
- **Faithful backend compensation:** each Q-item in the plan has visible, commented code (pre-checks, whitelist, two-step complete with retry, free-car-on-delete, maintenance previews that match the backend rules).
- **A single source of truth for theming:** CSS tokens feed both Tailwind and Ant Design, with a tested HSL→hex conversion and a contrast test suite.
- **Consistent conventions:** zero violations across Options API, tokens, formatters, geo helpers and notifications.
- **Validation that mirrors Mongoose** (VIN 2–17 uppercase, year 1886 to current + 1, fuel 0–100, names 2–50, licence 6–20, e-mail ≤ 254 with the same regex), and duplicate-key errors mapped to the right field.
- **Mature e2e harness:** per-run accounts with `finally` cleanup, no hard-coded credentials, no fixed waits, three-viewport layout + axe checks, and an endpoint-coverage assertion.
- **Readable code:** comments explain *why* (backend quirks, gotchas) rather than *what*.

---

## 11. Follow-up tasks

### T1 — Align all components and store modules with the `vue-component` and `vuex-module` skills

**Why.** The session transcripts show the project skills were not used consistently:

| Files | Skill use |
|---|---|
| App shell — 20 files: `App.vue`, `layouts/*`, `common/*`, header components, `BrandWordmark`, `NotFoundView` (Oct 28, Phase 2) | **Not invoked.** `SKILL.md` was only partly read with `sed` (lines 1–50 and 140–230); the skeleton, styling, Ant Design and forms sections were skipped |
| Admin sections — 18 files (Oct 29, three forked subagents) | **Not invoked by the agents.** The skill reached them only because forks inherit the parent's context; a fresh subagent would not have had it |
| Auth, fleet, car details, booking, trips, profile and admin shell — 34 files | Invoked before writing ✅ |

The convention greps are clean (§4), but the skills also require things the greps don't check. For example, `vue-component` §6 asks for a test file for every component with logic, and `vuex-module` §2 asks for per-user state to be cleared on sign-out. §7 and L4 / L10 / M2 show gaps in both.

**Mandatory process rule (applies to this task and to every future change):**

1. Before creating, rewriting or editing any `.vue` file, the agent **must invoke the `vue-component` skill with the Skill tool**. Reading `SKILL.md` partially with `cat` / `sed` / `Read` does not count.
2. Before creating or changing any Vuex module, `src/api/*.js` wrapper, or a component's `mapState` / `mapGetters` / `mapActions` usage, the agent **must invoke the `vuex-module` skill**.
3. When work is delegated, **every subagent (including forks) invokes the skills itself** at the start, and the delegation prompt names them explicitly ("Invoke the `vue-component` skill before touching any `.vue` file"). Inherited context is not enough.
4. If the code and a skill disagree, either fix the code or update the skill in the same change (`CLAUDE.md` §11: "keep them in sync"). Never silently diverge.

**Scope.**

- **Components (73 `.vue` files):** `App.vue`; `layouts/` (3); `views/` (7); `components/admin` (21), `auth` (4), `booking` (5), `brand` (1), `cars` (12), `common` (9), `layout` (7), `profile` (1), `trips` (2).
  Start with the 38 files written without the skill (the App shell and admin sections in the table above).
- **Store modules (10):** `auth`, `cars`, `carDetails`, `bookings`, `geo`, `admin/index`, `admin/fleet`, `admin/users`, `admin/trips`, `admin/insights`.
  Also check the API wrappers they call: `api/auth.js`, `users.js`, `cars.js`, `bookings.js`.

**Checklist — `vue-component` (each component):**

- [ ] **§1:** PascalCase multi-word name; correct folder; views have a lazy route.
- [ ] **§2:**
  - Options API skeleton in the documented option order.
  - `emits` always declared; props use object syntax with `type` and `required` / `default`.
  - No HTTP or `@/api/*` calls; store access only through namespaced map helpers.
  - English comments and copy.
- [ ] **§3:**
  - Token colours only; accent text uses `text-link`.
  - Type scale, radius and shadow utilities from the theme.
  - Status labels and tones from `@/utils/derive`; display values from `@/utils/format`.
  - No `!` prefixes or global resets.
- [ ] **§4:**
  - Ant Design components and icons auto-imported (no manual imports, no `components` entries).
  - `v-model:value` on Ant inputs.
  - No colour props or `.ant-*` colour overrides.
- [ ] **§5 (forms):**
  - `VeeForm as="div"` + `<a-form>` without `:model` / `:rules`.
  - `handleSubmit($event, onSubmit)`.
  - `:value` + `@update:value="handleChange"` + `@blur="handleBlur"`.
  - Zod 3 schema mirrors the backend limits.
- [ ] **§6 (tests):** every component with logic has a spec in a `__tests__` folder that follows the skill's pattern:
  - `attachTo` + `unmount`
  - `vi.waitFor` for VeeValidate
  - store / router in `global.plugins`
  - API wrappers mocked
  - `beforeEach` / `afterEach` with braces

  Missing today: `KpiCard`, `StartTimePicker`, `ShareButton`, `AdminSearch`, `AdminSidebar`, `LowFuelAlerts`, `TripDetailsDrawer`, `VehicleHistoryDrawer`, `CarGrid`, `FleetFilterControls` (see §7).
- [ ] **§7:** lint, `format:check`, test and build pass.

**Checklist — `vuex-module` (each module):**

- [ ] **§1:** every request goes through an `api/<resource>.js` wrapper on the shared `http` instance:
  - `unwrap` used
  - no hard-coded `/api/v2`, no direct `axios`
  - no manual auth headers
  - `skipAuthRedirect` only where intended
  - errors read with `getErrorMessage(err)`
- [ ] **§2:**
  - Namespaced; `state` is a factory; `UPPER_SNAKE` mutations.
  - Actions store the error **and re-throw**.
  - Strict-mode safe: no state mutated outside mutations, no in-place edits of state objects.
  - No client-supplied user ID for "my" data.
  - Pure logic lives in `src/utils/*` and getters only call it.
- [ ] **§2 (sign-out):** per-user state has a `RESET` mutation committed by `resetOnSignOut`.
  - Today the admin `filters` and `insights.date` are not reset (L10).
  - In-flight requests must not repopulate state after reset (M2).
- [ ] **§2 (caching):** lists shared by several views use the `loadedAt` + `CACHE_MS` + `{ force }` pattern and the shared in-flight promise from `cars.js`.
  - Today `fetchMine`, `admin/trips/fetchTrips` and `admin/users/fetchUsers` lack de-duplication or ordering (L4).
- [ ] **§3:** registered in `store/index.js` (nested `admin/*` through `admin/index.js`); `CLAUDE.md` §3 and §10 gotcha 6 kept accurate.
- [ ] **§4:**
  - Consumers use `mapState` / `mapGetters` in `computed` and `mapActions` / `mapMutations` in `methods`, with the namespace as the first argument.
  - Form fields bound to store state use computed `get` / `set`, never `v-model` straight onto state.
- [ ] **§5 (tests):**
  - Every action covered for success and error, in a test store with `strict: true`.
  - Every wrapper the module (and the modules it dispatches to) calls is mocked.
  - Dependent modules are included in the test store.

  Missing today: see §7 "Medium" row (`admin/users`, `admin/trips`, `admin/fleet`, `admin/insights` actions and getters, `bootstrap` network error).
- [ ] **§6:** lint, `format:check`, test and build pass.

**Deliverables.**

1. Code changes that bring every listed file in line with the checklists, with missing tests added.
2. A short alignment log (a table in the PR description or an appendix to this file) listing every component and module with ✅ / fixed / exception-with-reason.
3. Skill updates, if a rule turns out to be wrong or incomplete. For example, the `a-select` labelling rule (gotcha 21) and request ordering for out-of-order responses are not in the skills yet and are worth adding.

**Acceptance criteria.**

- The session transcript shows a `Skill(vue-component)` call before the first `.vue` edit and a `Skill(vuex-module)` call before the first store / API edit. This applies in the main session and in **every** subagent that edits those files.
- Every item in both checklists is ticked or has a documented exception.
- `npm run lint`, `npm run format:check`, `npm test`, `npm run build` and `npm run test:e2e` (Docker stack up) all pass in `frontend/`.
- There are no behaviour changes beyond the fixes listed in §3. Alignment is a refactor; bug fixes reference their finding ID.

---

## 12. Fix log

### 2026-10-30 — "Before merge" set (H1–H3, M1–M5, M8)

Process: the `vue-component` and `vuex-module` skills were invoked with the Skill tool before any edit (T1 rule 1–2). Every new regression test was checked to **fail on the old code** and pass with the fix.

| ID | Fix | Files | Tests |
|---|---|---|---|
| H1 | `createBooking` sends the caller's `userId` (admins need it; the backend overwrites it for users, so Q4 still holds) | `store/modules/bookings.js` | `bookings.spec.js` — admin payload |
| H2 | `check()` keeps a request counter and ignores answers for an earlier opening or another car; a fresh copy only replaces the car the modal was opened for; `confirm()` books `this.car._id` | `components/cars/QuickBookModal.vue` | `QuickBookModal.spec.js` — reopen while a check is pending |
| H3 | Solid danger buttons removed: `DeleteTripModal` uses `danger` without `type="primary"`; the fleet / user popconfirms and the maintenance modal use `ok-type="default"`. The theme token stays (it is correct for primary-yellow fills such as buttons and selected date cells) | `DeleteTripModal.vue`, `AdminFleetTable.vue`, `AdminUsersTable.vue`, `MaintenanceActions.vue` | new `theme/__tests__/dangerButtons.spec.js` (scans every `.vue` file); `contrast.spec.js` adds `primary-foreground` on `primary` / `primary-hover` |
| M1 | `fetchCar` records the requested id and a request counter (`START_REQUEST`); late answers, late errors and slow polls for another car are dropped, and `isLoading` belongs to the latest request | `store/modules/carDetails.js` | `carDetails.spec.js` — 4 out-of-order cases |
| M2 | `fetchMine`, `admin/trips/fetchTrips` and `admin/users/fetchUsers` drop a response (and its error) when the session token changed during the request | `bookings.js`, `admin/trips.js`, `admin/users.js` | `bookings.spec.js`, `admin.spec.js` |
| M3 | The pending live search update is cancelled when the route leaves `/fleet`, and re-checked inside the timer | `components/layout/HeaderSearch.vue` | `layout.spec.js` |
| M4 | The confirmation dialog is named by its heading (`wrap-props` → `aria-labelledby`) and emits `closed`. The car page then calls `focusConfirm()`, which falls back to the focusable panel (`tabindex="-1"`, focus ring) when the button is disabled. This also fixes **L15** (mobile Book bar) | `BookingConfirmedModal.vue`, `BookingPanel.vue`, `views/CarDetailsView.vue` | `booking.spec.js` — dialog name, focus target |
| M5 | User / Car selects labelled through `html-for` + `id` (the ignored `aria-label`s removed) | `components/admin/BookingFormModal.vue` | `trips.spec.js` |
| M8 | Visible name and screen-reader name split into two spans, so `truncate` is no longer undone by `not-sr-only` | `components/layout/UserMenu.vue` | `layout.spec.js` |
| Info | Stray backspace character removed from the `contrast.spec.js` comment | `styles/__tests__/contrast.spec.js` | — |

**Docs and skills kept in sync (T1 rule 4):**
- `vue-component` §4: no solid danger buttons, `a-select` labelling, async results in components.
- `vuex-module` §2: drop responses that arrive after sign-out, and out-of-order responses for page data.
- `CLAUDE.md` gotcha 21: `html-for` option added. New gotcha 23: no solid danger buttons.

**Verification:**
- `npm run lint` ✅
- `npm run format:check` ✅
- `npm test`: 40 files, **485 tests** ✅ (+1 file, +20 tests)
- `npm run build` ✅
- `npx playwright test`: **35 / 35** ✅

**Still open:** M6, M7, M9–M15 and all Low items (see §9 "Next sprint" / "Backlog"), and T1.
