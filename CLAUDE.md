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
        ├── main.js                    ← creates Vue app, installs router + store
        ├── App.vue                    ← root component
        ├── api/
        │   └── http.js                ← axios instance (baseURL from VITE_API_URL, defaults to /api/v2)
        ├── router/
        │   └── index.js               ← routes: / (HomeView), catch-all (NotFoundView)
        ├── store/
        │   └── index.js               ← Vuex store (empty modules, strict in dev)
        ├── views/
        │   ├── HomeView.vue
        │   └── NotFoundView.vue
        ├── components/                ← reusable components (empty, kept by .gitkeep)
        ├── styles/
        │   ├── main.css               ← CSS entry: layer order, Tailwind, antd reset, token → Tailwind color mapping
        │   └── design-system.css      ← design tokens (HSL channels) for light and `.dark` themes
        ├── theme/
        │   └── antd.js                ← builds the Ant Design theme from the CSS design tokens
        └── __tests__/
            └── App.spec.js
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

- **Routing**: lazy-loaded views, catch-all 404.
- **API calls**: go through the shared `axios` instance in `api/http.js`; the Vite dev server proxies `/api` requests to the backend (`VITE_BACKEND_URL`).
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

- **Colors come from the design system** (`styles/design-system.css`). Use the token classes — `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `border-border`, `border-input`, `ring-ring` — **not** Tailwind palette colors (`text-gray-500`, `bg-blue-600`) or hex values.
- To add a token: define it in both `:root` and `.dark` in `design-system.css`, map it in `@theme inline` in `main.css`, and, if Ant Design should use it, add it to `TOKEN_MAP` in `theme/antd.js`.
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
5. **No components yet**: `src/components/` only holds a `.gitkeep`; remove it once the first component is added.
6. **Vuex store is empty**: The store has no modules yet — ready to be populated as features are built.
7. **Dev server proxy**: In development, the Vite dev server proxies `/api` to the backend. This means API calls just use relative paths (`/api/v2/...`) — no CORS setup needed in dev.
8. **Zod must stay on v3**: VeeValidate 4 does not validate Zod 4 schemas (invalid values pass). Keep `zod@^3` with `@vee-validate/zod`.
9. **Tokens need a `jti`**: every JWT carries a unique ID used for logout/revocation; tokens without one are rejected.
10. **Ant Design dark mode shifts primary**: Ant Design's dark algorithm slightly darkens `colorPrimary`, so primary buttons are a bit darker than `#FADF7F` in dark mode.
11. **Windows host**: the project lives on Windows (`D:\Carshes`). `node_modules` must be installed on the machine that runs the code — never copy `node_modules` from Linux (platform-specific binaries for Vite/Rolldown, Tailwind and Lightning CSS).
12. **Seeding wipes data**: `seed:cars` deletes all bookings, credit cards, cars, production info and non-admin users before inserting samples. Admin users are kept. Seeded users share the password from `SEED_USER_PASSWORD` (default `Password123!`).
