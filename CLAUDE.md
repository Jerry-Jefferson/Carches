# CLAUDE.md — Carshes Project Memory

> Read this file at the start of every session. It contains the authoritative summary of the project's tech stack, architecture, directory layout, conventions, and known gotchas.

---

## 1. What Is Carshes?

A **car-sharing web service** split into two fully independent packages:

| Part       | Path        | Purpose                        |
|------------|-------------|--------------------------------|
| Backend    | `backend/`  | REST API serving JSON data     |
| Frontend   | `frontend/` | SPA consuming the API          |

There is **no monorepo tooling** — each folder has its own `package.json`, `node_modules`, `.env`, and lint/format configs. Always `cd` into the correct folder before running commands.

---

## 2. Tech Stack

### Backend (`backend/`)

| Layer            | Technology                                  |
|------------------|---------------------------------------------|
| Runtime          | **Node.js 22+** (CommonJS modules)          |
| Framework        | **Express 5**                               |
| Database         | **MongoDB** via **Mongoose 9**              |
| Authentication   | **JWT** (`jsonwebtoken`) + **bcryptjs**      |
| API Docs         | **Swagger UI Express** (static `swagger.json`) |
| Containerisation | **Docker** + **Docker Compose**             |
| Linting          | ESLint 9 (`eslint.config.mjs`)              |
| Formatting       | Prettier (`.prettierrc`)                    |

### Frontend (`frontend/`)

| Layer            | Technology                                         |
|------------------|----------------------------------------------------|
| Framework        | **Vue 3** — **Options API only** (see §8.2)        |
| Build tool       | **Vite 8**                                         |
| Routing          | **Vue Router 5** (history mode, lazy-loaded views) |
| State management | **Vuex 4** (strict mode in dev, modular store)     |
| UI library       | **Ant Design Vue 4** (auto-imported via `unplugin-vue-components`) |
| HTTP client      | **Axios** (instance in `src/api/http.js`)          |
| Form validation  | **VeeValidate 4** + **Zod 3** (via `@vee-validate/zod`) |
| Styling          | **Tailwind CSS 4** (via `@tailwindcss/vite` plugin) + custom design-system CSS |
| Testing          | **Vitest 5** (jsdom env, globals enabled)          |
| Linting          | ESLint 10 + `eslint-plugin-vue` + `eslint-config-prettier` |
| Formatting       | Prettier (`.prettierrc.json`)                      |

---

## 3. Directory Map

```
Carshes/
├── CLAUDE.md                          ← this file
├── .mcp.json                          ← MongoDB MCP server (read-only)
├── .claude/skills/                    ← project skills (see §11)
├── README.md
├── .gitignore
│
├── backend/
│   ├── .env / .env.example            ← Mongo creds, JWT secret, admin seed info
│   ├── docker-compose.yaml            ← services: app (Node), mongodb
│   ├── Dockerfile
│   ├── package.json                   ← scripts: start, dev, compose-up, seed:cars, migrate:admin
│   ├── eslint.config.mjs
│   ├── .prettierrc
│   └── src/
│       ├── app.js                     ← Express entry point; mounts /api/v2 router, /api-docs
│       ├── swagger.json               ← OpenAPI spec served at /api-docs
│       ├── config/
│       │   └── auth.js                ← JWT & bcrypt settings (reads env vars)
│       ├── db/
│       │   └── connection.js          ← Mongoose connection helper
│       ├── models/
│       │   ├── user.model.js
│       │   ├── car.model.js
│       │   ├── booking.model.js
│       │   ├── creditCard.model.js
│       │   ├── productionInfo.model.js
│       │   └── revokedToken.model.js
│       ├── routes/
│       │   ├── api.js                 ← top-level router: /auth (public), /cars /users /bookings (authenticated)
│       │   ├── auth.routes.js
│       │   ├── car.routes.js
│       │   ├── user.routes.js
│       │   └── booking.routes.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── car.controller.js
│       │   ├── user.controller.js
│       │   └── booking.controller.js
│       ├── services/
│       │   ├── auth.service.js
│       │   ├── car.service.js
│       │   ├── user.service.js
│       │   └── booking.service.js
│       ├── middleware/
│       │   ├── authenticate.js        ← JWT verification
│       │   ├── requireRole.js         ← role-based access guard
│       │   ├── validateAuthBody.js    ← request-body validation
│       │   └── errorHandler.js        ← centralised error handler
│       ├── utils/
│       │   ├── AppError.js            ← custom error class
│       │   ├── catchAsync.js          ← async wrapper for controllers
│       │   └── gracefulShutdown.js    ← SIGTERM/SIGINT handler
│       ├── migrations/
│       │   └── 001-create-default-admin.js
│       ├── seed/
│       │   └── cars.js                ← sample car data seeder
│       └── constants/
│           ├── seed.js
│           ├── user.js
│           └── vehicle.js
│
└── frontend/
    ├── .env.example                   ← VITE_API_URL, VITE_BACKEND_URL
    ├── index.html                     ← SPA shell
    ├── vite.config.js                 ← Vue + Tailwind + auto-import plugins, dev proxy to backend
    ├── package.json                   ← scripts: dev, build, preview, test, lint, format
    ├── eslint.config.js
    ├── .prettierrc.json / .prettierignore
    ├── public/                        ← static assets
    └── src/
        ├── main.js                    ← installs the session interceptors, creates the app with router + store
        ├── App.vue                    ← root: Ant Design theme + layout picked by route.meta.layout
        ├── api/
        │   ├── http.js                ← axios instance (baseURL from VITE_API_URL, defaults to /api/v2), unwrap, error normalising
        │   ├── session.js             ← wires http to the store/router: Bearer token, 401 → /auth?redirect=
        │   └── auth.js / users.js / cars.js / bookings.js ← thin wrappers for E1–E23, used only by Vuex actions
        ├── router/
        │   ├── index.js               ← route table (meta: layout, guestOnly, roles, title)
        │   └── guards.js              ← auth guard, safeRedirect(), document title
        ├── store/
        │   ├── index.js               ← Vuex store (strict in dev); resetOnSignOut plugin clears `bookings` and `admin/*` data on auth/CLEAR_SESSION
        │   └── modules/
        │       ├── auth.js            ← session: signIn, signUp, logout, bootstrap (GET /users/me)
        │       ├── cars.js            ← GET /cars (30 s cache), fleet filters, sorting, counts, nearest free car, upsertCar
        │       ├── bookings.js        ← GET /bookings/my (60 s cache), checkBookable + createBooking with pre-checks (Q2–Q4), 	rips (bookings joined with cars, Q5)
        │       ├── carDetails.js      ← GET /cars/:id for the car page (not-found flag, silent refresh for polling), distance
        │       ├── geo.js             ← browser location on request (answer remembered per tab), Minsk fallback
        │       └── admin/             ← console (`admin/loadAll`): fleet (E11–E17, widgets, table filters), users (E5–E8), trips (E19–E23; completeTrip = E22 + E12), insights (selected day, KPIs)
        ├── layouts/                   ← AuthLayout, AppLayout (header + footer), AdminLayout (sidebar + top bar)
        ├── views/                     ← AuthView, FleetView, CarDetailsView, MyTripsView, MyProfileView, AdminView, NotFoundView
        ├── components/
        │   ├── brand/                 ← BrandWordmark
        │   ├── common/                ← StatusTag, EnergyBar, PillGroup, InfoCallout, EmptyState, ErrorState, CarPlaceholder, InitialsAvatar, MapView (Leaflet, lazy)
        │   ├── layout/                ← AppHeader, MainNav, HeaderSearch, UserMenu, AppFooter; AdminSidebar, AdminSearch (rendered by AdminLayout)
        │   ├── cars/                  ← fleet: FleetHeader, FleetFilters (+ FleetFilterControls), SortDropdown, CarCard, CarGrid, FleetMap, QuickBookModal; car page: CarDetailsHeader, ShareButton, SpecCard, CarLocationMap
        │   ├── booking/               ← BookingPanel (now / schedule), StartTimePicker, BookingSummary, BookingConfirmedModal, MobileBookingBar
        │   ├── trips/                 ← ActiveTripCard, TripListItem, tripDisplay.js (car name / link for a joined trip)
        │   ├── profile/               ← ProfileCard
        │   ├── admin/                 ← KpiCard, AdminSparkline, StackedBar; AdminFleetSection / AdminTripsSection / AdminUsersSection with their tables, forms (Zod schemas in *Schema.js), drawers, map and widgets
        │   └── auth/                  ← AuthCard, AuthTabs, SignInForm, RegisterForm, schemas.js (Zod rules + mapAuthError)
        ├── styles/
        │   ├── main.css               ← CSS entry: layer order, Tailwind, antd reset, token → Tailwind color mapping
        │   └── design-system.css      ← design tokens (HSL channels) for light and `.dark` themes
        ├── theme/
        │   ├── antd.js                ← builds the Ant Design theme from the CSS design tokens
        │   └── tones.js               ← tone name → full Tailwind class names (soft / solid / text)
        ├── constants/
        │   └── site.js                ← brand name, tagline, city, support contacts, footer links
        ├── utils/
        │   ├── format.js              ← display formatters (ru-BY numbers, BYN, English dates in Europe/Minsk, km, %, coords, names)
        │   ├── derive.js              ← booking status, trip metrics, car/booking status meta (label, tone, icon), fuel tone
        │   ├── fleetFilters.js        ← fleet filter defaults, URL query ⇄ filters, client-side filter / sort / counts
        │   ├── admin.js               ← console KPIs, table filters, maintenance previews, global search, ADMIN_TABS
        │   ├── adminExport.js         ← CSV columns for the fleet / users / trips export
        │   ├── schedule.js            ← scheduled booking start: 7-day window, picker value ⇄ Date, disabled days / times
        │   ├── geo.js                 ← GeoJSON [lng, lat] ↔ { lat, lng }, Haversine, walking time, Minsk centre, map links
        │   ├── csv.js                 ← CSV export (BOM, escaping, formula-injection guard) + download helper
        │   ├── tokenStorage.js        ← JWT in localStorage ("Remember me") or sessionStorage
        │   └── notify.js              ← toasts / notifications (use instead of Ant Design's message directly)
        ├── test/
        │   └── setup.js               ← Vitest setup: matchMedia / ResizeObserver polyfills for Ant Design
        └── __tests__/
            └── App.spec.js            ← further tests sit next to their code in `__tests__/` folders
```

---

## 4. Architecture

### Backend

```
Request → Express router (/api/v2)
       → [authenticate middleware] (JWT)
       → [requireRole middleware] (optional, role-based)
       → Controller (thin — delegates to service)
       → Service (business logic, Mongoose queries)
       → Model (Mongoose schema + validation)
       → MongoDB
```

- **Layered architecture**: routes → controllers → services → models.
- **Error handling**: controllers wrapped with `catchAsync`; errors bubble up to the centralised `errorHandler` middleware.
- **Auth flow**: register/login → JWT issued → token sent in `Authorization: Bearer <token>` header → `authenticate` middleware verifies → `requireRole` checks role.
- **Token revocation**: revoked JWTs stored in `revokedToken` model.
- **Roles**: `user` and `admin`, with a hierarchy (`ROLE_LEVELS` in `constants/user.js`) — `requireUser` lets both through, `requireAdmin` only admins. Role is read from `req.user`, which `authenticate` loads from the database, so role changes apply immediately.
- **Users are created only via `POST /auth/signup`** (always role `user`). Admins come from the `migrate:admin` migration or a manual DB update. There is no `POST /users`.
- **Soft delete**: `User`, `Car` and `CreditCard` use `isDeleted` / `deletedAt`. Every read query must filter `isDeleted: false`; deleted users cannot sign in and their tokens are rejected.
- **Response shapes**: success → `{ message, data }`; error → `{ status: "error", statusCode, message }` (built by `errorHandler`).

### Frontend

```
main.js → createApp(App)
        → use(router)   — Vue Router (history mode)
        → use(store)    — Vuex
        → mount('#app')
```

- **Routing**: lazy-loaded views, catch-all 404. `route.meta.layout` (`auth` / `app` default / `admin`) picks the layout in `App.vue`.
- **Access** (`router/guards.js`): the guard first restores the stored session (`auth/bootstrap` → `GET /users/me`). Guests can open only `meta.guestOnly` routes (`/auth`); everything else redirects to `/auth?redirect=<target>`. Signed-in users are sent from `/auth` to `/fleet`; `meta.roles` routes (`/admin`) send other roles to `/fleet` with a warning.
- **Session**: the token is kept by `utils/tokenStorage.js` (localStorage with "Remember me", otherwise sessionStorage; sign-up uses sessionStorage). `api/session.js` adds the Bearer header and, on a 401 from any request except sign-in/sign-up (or one sent with `{ skipAuthRedirect: true }`), clears the session and redirects to `/auth?redirect=…`.
- **Auth screen**: `/auth?mode=signin|signup&redirect=/path`. The forms dispatch `auth/signIn` / `auth/signUp` and emit `success`; `AuthView` goes to `safeRedirect(redirect)` or `/fleet`. Backend errors go through `mapAuthError()` — known messages (duplicate e-mail / licence number, invalid e-mail, password length) appear under the field, everything else in a form-level alert.
- **API calls**: components never call HTTP — Vuex actions call the `api/*.js` wrappers, which use the shared `axios` instance in `api/http.js`; errors carry `statusCode` and the backend `message`. The Vite dev server proxies `/api` requests to the backend (`VITE_BACKEND_URL`).
- **Component auto-import**: Ant Design Vue components are auto-resolved by `unplugin-vue-components` — no manual imports needed.
- **Theming**: one source of truth — CSS variables in `styles/design-system.css`. Tailwind reads them through `@theme inline` in `main.css`; Ant Design reads them at runtime through `buildAntdTheme()` in `theme/antd.js`. `App.vue` keeps the result in `data()` and rebuilds it from a `MutationObserver` when the `.dark` class on `<html>` changes.

---

## 5. Key URLs & Ports

| What                 | URL                                 |
|----------------------|-------------------------------------|
| Frontend (dev)       | `http://localhost:5173`             |
| Backend API          | `http://localhost:3000/api/v2`      |
| Swagger docs         | `http://localhost:3000/api-docs`    |
| MongoDB (host)       | `localhost:27018` (mapped from container's `27017`) |

> **Note**: The API base path is **`/api/v2`** (backend, Swagger, README and the axios default all agree).
---

## 5a. API Endpoints & Access

| Endpoint | Access |
|----------|--------|
| `POST /auth/signup`, `POST /auth/signin` | public |
| `POST /auth/logout`, `GET /cars`, `GET /cars/:id`, `GET /users/me`, `GET /bookings/my`, `POST /bookings` | `user` (and `admin`) |
| everything else under `/cars`, `/users`, `/bookings` | `admin` only |

- "My data" endpoints (`/users/me`, `/bookings/my`) take the user ID **only** from the token — never from params, query or body (IDOR protection).
- `POST /bookings`: for non-admins the `userId` in the body is overwritten with the caller's ID.
- `PUT /users/:id` ignores `password` and `role`.
- `PUT` / `DELETE /cars/:vin` use the VIN; `GET /cars/:id` uses the Mongo ObjectId (400 on invalid format).
- **Route order matters**: static paths (`/me`, `/my`, `/reserved`, `/in-use/low-fuel`, `/service-old-or-high-mileage`, …) must be registered **before** `/:id` / `/:vin`.

---

## 6. Environment Variables

### Backend (`.env`)

| Variable                    | Purpose                              |
|-----------------------------|--------------------------------------|
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root user (Docker init)     |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password (Docker init) |
| `MONGO_INITDB_DATABASE`     | Database name (`carshes`)            |
| `DATABASE_URI`              | Mongoose connection string           |
| `PORT`                      | Express listen port (default `3000`) |
| `JWT_SECRET`                | ≥ 32 chars, HS256 signing key        |
| `JWT_EXPIRES_IN`            | Token lifetime (default `1h`)        |
| `BCRYPT_SALT_ROUNDS`        | 10–15 (default `12`)                |
| `ADMIN_EMAIL`               | Default admin email (migration)      |
| `ADMIN_PASSWORD`            | Default admin password (≥ 12 chars)  |
| `ADMIN_FIRST_NAME/LAST_NAME/LICENSE_NUMBER` | Admin profile fields |

### Frontend (`.env`)

| Variable            | Purpose                                                    |
|---------------------|------------------------------------------------------------|
| `VITE_API_URL`      | Axios base URL (code default `/api/v2`) |
| `VITE_BACKEND_URL`  | Vite proxy target (default `http://localhost:3000`)        |

---

## 7. Common Commands

### Backend (run from `backend/`)

```bash
npm install                    # install deps
docker compose up -d           # start MongoDB + API in Docker
docker compose up -d mongodb   # start only MongoDB
npm run dev                    # start API with --watch (needs MongoDB running)
npm run migrate:admin          # create default admin user
npm run seed:cars              # seed sample data inside the Docker `app` container
node src/seed/cars.js          # seed sample data (API on host)
```

### Frontend (run from `frontend/`)

```bash
npm install                    # install deps
npm run dev                    # Vite dev server at :5173
npm run build                  # production build → dist/
npm run preview                # serve production build
npm test                       # run Vitest once
npm run test:watch             # Vitest in watch mode
npm run lint                   # ESLint check
npm run lint:fix               # ESLint auto-fix
npm run format                 # Prettier format
npm run format:check           # Prettier check only
```

---

## 8. Conventions & Patterns

### 8.1 General

- **Module system**: Backend is **CommonJS** (`require`/`module.exports`). Frontend is **ES Modules** (`import`/`export`).
- **File naming**: Backend uses `kebab-case` with suffixes (e.g., `car.model.js`, `auth.controller.js`). Frontend uses `PascalCase` for Vue components (`HomeView.vue`) and `camelCase` for JS modules.
- **Error handling pattern**: Backend controllers use `catchAsync(async (req, res) => { ... })` wrapper. Custom errors use `AppError` class.
- **Validation**: Backend validates auth bodies via `validateAuthBody` middleware. Frontend uses VeeValidate + Zod schemas.
- **Swagger**: The OpenAPI spec is a static `swagger.json` file — update it manually when adding/changing endpoints.
- **Ant Design components**: Auto-imported globally — just use them in templates without importing. Resolved by `AntDesignVueResolver`.
- **Path alias**: `@` maps to `frontend/src/` (configured in `vite.config.js`).
- **Code style differs per package** — never copy formatting between them:
  - Backend Prettier: double quotes, semicolons, trailing commas `es5`, width 100.
  - Frontend Prettier: single quotes, **no** semicolons, trailing commas `all`, width 100.
- **Comments and UI text are in English** only.
- **Before finishing a change**, run in the affected package: `npm run lint` and Prettier (`npm run format:check` in frontend, `npx prettier --check src` in backend); in frontend also `npm test` and `npm run build`. Update `swagger.json` for any endpoint change.

### 8.2 Vue: Options API only

All Vue components **must use the Options API** — enforced by ESLint (`vue/component-api-style: ['error', ['options']]`). Do not use `<script setup>`, `setup()`, or Composition API functions (`ref`, `reactive`, `computed`, `watch`, `onMounted`, … imported from `vue`) inside components, and do not write new composables.

```vue
<script>
export default {
  name: 'CarCard',
  props: { car: { type: Object, required: true } },
  emits: ['select'],
  data() {
    return { isLoading: false }
  },
  computed: {
    title() {
      return `${this.car.brand} ${this.car.model}`
    },
  },
  methods: {
    select() {
      this.$emit('select', this.car)
    },
  },
}
</script>
```

- Component options order: `name`, `components`, `props`, `emits`, `data`, `computed`, `watch`, lifecycle hooks, `methods` (checked by `vue/order-in-components`, warning level).
- Multi-word component names (`vue/multi-word-component-names`), e.g. `CarCard`, `BookingList`.
- **Vuex**: access through `mapState`, `mapGetters`, `mapActions`, `mapMutations` in `computed` / `methods`; use namespaced modules in `src/store/modules/`.
- **Router**: use `this.$router` / `this.$route`.
- **Forms**: use VeeValidate's `<Form>` / `<Field>` / `<ErrorMessage>` components with `:validation-schema="toTypedSchema(zodSchema)"` (`toTypedSchema` from `@vee-validate/zod`) — not `useForm` / `useField`.
- **HTTP**: import the shared instance from `@/api/http.js`; do not create new axios instances or hardcode `/api/v2` URLs.

### 8.3 Styling

- **Colors come from the design system** (`styles/design-system.css`). Use the token classes — `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `bg-surface`, `border-border`, `border-input`, `ring-ring` — **not** Tailwind palette colors (`text-gray-500`, `bg-blue-600`) or hex values.
- **Feedback / status tokens**: `destructive`, `success`, `warning`, `info`, each with a `-foreground` (e.g. `text-destructive`, `bg-success text-success-foreground`). For soft backgrounds use opacity (`bg-success/15 text-success`) — there are no "-soft" tokens. Ant Design reads them as `colorError`, `colorSuccess`, `colorWarning`, `colorInfo`.
- **`surface`** (white in light mode) is the Ant Design container background (`colorBgContainer`) — inputs, tables, selects. Cards keep the cream `card` color via `bg-card`.
- **Status → tone mapping** lives in `utils/derive.js` (`CAR_STATUS_META`, `BOOKING_STATUS_META`, `fuelTone`); `tone` is a token name. Cars: `free` Available → `success`, `reserved` Reserved → `warning`, `in_use` In trip → `info`, `unavailable` Unavailable → `muted`, `in_service` In service → `destructive`. Bookings: Active → `info`, Upcoming → `warning`, Completed → `success`. Fuel: < 25 % `destructive`, < 40 % `warning`, else `success`. Always show status as text **and** colour.
- To add a token: define it in both `:root` and `.dark` in `design-system.css`, map it in `@theme inline` in `main.css`, and, if Ant Design should use it, add it to `TOKEN_MAP` in `theme/antd.js`. Text-like tokens must pass WCAG AA — add them to `STATUS_TOKENS` in `styles/__tests__/contrast.spec.js`.
- **Font**: Plus Jakarta Sans 400–700, self-hosted via `@fontsource/plus-jakarta-sans` (imported in `main.js`), exposed as `--font-sans` (`font-sans`); Ant Design's `fontFamily` is read from the same variable.
- **Type scale** (`main.css` `@theme`): `text-display`, `text-headline-lg|md|sm`, `text-body-lg|md|sm`, `text-label-lg|md|sm` — each sets size, line height and weight. `text-label-sm` is meant to be combined with `uppercase`.
- **Radius roles**: `rounded-control` (8 px — inputs, buttons; Ant Design `borderRadius`), `rounded-card` (12 px; `borderRadiusLG`), `rounded-dialog` (16 px — auth card, modals), `rounded-full` for pills.
- **Elevation**: `shadow-card`, `shadow-popover` — warm shadows built from the `--shadow` token (black in dark mode).
- **Motion**: `animate-status-pulse` (status dot), `ease-soft` for hover lifts / zooms. A global `prefers-reduced-motion` rule in `main.css` disables animations and transitions — don't override it.
- Token values are HSL channels without `hsl()` (e.g. `45 93% 74%`); use `hsl(var(--primary))` or `hsl(var(--primary) / 0.5)` in raw CSS.
- **Dark mode** is the `.dark` class on `<html>`; `dark:` utilities follow it (not the OS setting).
- Tailwind **Preflight is disabled** (Ant Design's reset is used instead) and **utilities are `!important`** so they beat Ant Design's runtime CSS-in-JS. Do not re-enable Preflight or remove `important`.
- Prefer Ant Design components for UI controls; use Tailwind for layout and spacing.

---

## 9. Data Model Overview

| Model            | Key Fields                                                    |
|------------------|---------------------------------------------------------------|
| **User**         | email (unique), password (bcrypt, `select: false`), role (`user`/`admin`), firstName, lastName, licenseNumber (unique) — all required; isDeleted, deletedAt |
| **Car**          | productionInfo (ref), vin (unique, 17 chars), registrationNumber, status (`free`/`reserved`/`in_use`/`unavailable`/`in_service`), fuelLevel, mileage, location (GeoJSON point), isDeleted, deletedAt |
| **Booking**      | userId (ref User), carId (ref Car), startDate, endDate, startFuelLevel, startMileage, finishFuelLevel, finishMileage |
| **CreditCard**   | userId (ref User), number, owner, validThrough, isAuthorized, isDeleted, deletedAt |
| **ProductionInfo** | brand, model, year                                          |
| **RevokedToken** | jti, userId, expiresAt (TTL index — entries auto-delete when the token would have expired) |

> There is no "driver" entity any more — it was merged into `User`. Use `userId`, never `driverId`.

---

## 10. Known Gotchas

1. **MongoDB port**: The container exposes `27018` on the host (not the default `27017`) to avoid conflicts.
2. **JWT_SECRET validation**: The app will crash on startup if `JWT_SECRET` is missing or < 32 characters. Same for `BCRYPT_SALT_ROUNDS` outside 10–15 range.
3. **No shared dependencies**: Do not try to hoist deps or use workspace-level `package.json`. Each part is fully standalone.
4. **Swagger is static**: `swagger.json` is hand-maintained. It is not auto-generated from code — keep it in sync when changing routes.
5. **Implementation plan**: `implementation-plan.md` (repo root) is the frontend roadmap — phases 1–6 (foundations, platform, auth, fleet, car details / trips / profile, admin console) are done; phase 7 (quality and release) remains.
6. **Store modules**: `auth`, `cars`, `carDetails`, `bookings`, `geo` and the nested `admin` module (`admin/fleet`, `admin/users`, `admin/trips`, `admin/insights`). The admin console's car list is the root `cars` module. Add new modules with the `vuex-module` skill.
7. **Dev server proxy**: In development, the Vite dev server proxies `/api` to the backend. This means API calls just use relative paths (`/api/v2/...`) — no CORS setup needed in dev.
8. **Zod must stay on v3**: VeeValidate 4 does not validate Zod 4 schemas (invalid values pass). Keep `zod@^3` with `@vee-validate/zod`.
9. **Tokens need a `jti`**: every JWT carries a unique ID used for logout/revocation; tokens without one are rejected.
10. **Ant Design dark mode shifts primary**: Ant Design's dark algorithm slightly darkens `colorPrimary`, so primary buttons are a bit darker than `#FADF7F` in dark mode.
11. **Windows host**: the project lives on Windows (`D:\Carshes`). `node_modules` must be installed on the machine that runs the code — never copy `node_modules` from Linux (platform-specific binaries for Vite/Rolldown, Tailwind and Lightning CSS).
12. **Seeding wipes data**: `seed:cars` deletes all bookings, credit cards, cars, production info and non-admin users before inserting samples. Admin users are kept. Seeded users share the password from `SEED_USER_PASSWORD` (default `Password123!`).
13. **Coordinates are `[lng, lat]`**: the backend stores GeoJSON points. Convert with `toLatLng` / `toGeoJsonPoint` from `utils/geo.js` — never index `coordinates` by hand.
14. **Dates show Minsk time**: `utils/format.js` formats in `Europe/Minsk` regardless of the browser timezone; use its helpers instead of `toLocaleString()`.
15. **Vitest stubs CSS**: `css: false` turns `.css?raw` imports into empty strings — tests that need a stylesheet read it with `node:fs` (see `styles/__tests__/contrast.spec.js`).
16. **Fleet filters live in the URL**: `/fleet?q=&brand=&available=0&status=&fuel=&sort=&map=1` is the source of truth; `FleetView` copies it into the `cars` store (only while on `/fleet`, so filters survive a trip to a car page). Change filters with `router.replace`, never by committing directly.
17. **Lazy components vs auto-import**: `unplugin-vue-components` resolves any tag matching a file in `src/components` to a *static* import, defeating `defineAsyncComponent`. Register lazy components under another name (e.g. `LazyFleetMap`). In tests, mock such modules with `__esModule: true`.
18. **Booking times**: the scheduled-start picker works in the browser's local time (`SCHEDULE_VALUE_FORMAT` strings, no direct `dayjs` import — it is only a dependency of Ant Design), while dates are displayed in Minsk time. The two match for users in Minsk.
19. **Vitest timeout is 15 s** (`vite.config.js`): each test file runs in its own worker and its first test imports Ant Design, which can exceed the 5 s default when the whole suite runs.
20. **Admin console URL**: `/admin?tab=fleet|trips|users` picks the section; `&car=`, `&trip=`, `&user=` point at a row (search results and the history / user drawers link through these). `AdminLayout` renders the sidebar and search itself, because `App.vue` only fills its default slot. Admin data reloads every 60 s while the tab is visible.

---

## 11. Skills & MCP

### Project skills (`.claude/skills/`)

| Skill | Use it when |
|-------|-------------|
| `vue-component` | creating or rewriting any `.vue` file — Options API skeleton, design tokens, Ant Design, VeeValidate form pattern, test file |
| `vuex-module` | adding frontend state or API calls — namespaced module, actions via `@/api/http`, map helpers, tests |
| `docker-workflow` | starting, rebuilding or inspecting containers; running migrations and seeds |
| `swagger-update` | any backend route, request body or response change |

The patterns in `vue-component` and `vuex-module` were checked with real tests; keep them in sync if the conventions change.

### MongoDB MCP (`.mcp.json`)

- Server: official `mongodb-mcp-server` (v3), started with `--readOnly` — query, aggregate, count, schema, indexes, stats. No insert/update/delete tools are exposed. Telemetry is disabled.
- Connection string comes from the `MDB_MCP_CONNECTION_STRING` environment variable (never commit credentials). From the host the database is on port `27018`:
  `mongodb://<MONGO_INITDB_ROOT_USERNAME>:<MONGO_INITDB_ROOT_PASSWORD>@localhost:27018/carshes?authSource=admin`
- The command uses `cmd /c npx …` because the project runs on native Windows. On macOS/Linux/WSL change it to `"command": "npx"` with the same args minus `"/c"`.
- To allow writes temporarily, remove `--readOnly` locally — don't commit that.
- Use it to inspect data (e.g. check soft-deleted users, revoked tokens, seeded cars) instead of writing ad-hoc scripts; make data changes through the API, migrations or the seeder.
