# Carshes

Car-sharing service, split into two independent parts:

| Folder      | What it is                                                                 |
|-------------|----------------------------------------------------------------------------|
| `backend/`  | REST API — Node.js, Express, MongoDB (Mongoose), JWT auth, Swagger docs     |
| `frontend/` | Web app — Vue 3, Vite, Vue Router, Vuex, Ant Design Vue, Tailwind CSS       |

Each folder has its own `package.json`, dependencies and `.env`. There is no shared tooling: run commands inside the folder you're working on.

## Prerequisites

- Node.js 22+ and npm
- Docker with Docker Compose (for MongoDB, or to run the whole backend)

## Backend

All commands below run from `backend/`.

1. **Configure environment variables**

   ```bash
   cd backend
   cp .env.example .env
   ```

   Then edit `.env`:

   - `MONGO_INITDB_*` — credentials for the MongoDB container.
   - `DATABASE_URI` — how the API connects to MongoDB. Inside Docker Compose use host `mongodb:27017`; when running the API directly on your machine use `localhost:27018`.
   - `JWT_SECRET` — a random string of at least 32 characters.
   - `ADMIN_*` — credentials for the default admin account (password: 12+ characters).

2. **Start it** — choose one:

   - **Everything in Docker (API + MongoDB):**

     ```bash
     docker compose up -d --build
     ```

   - **API on your machine, MongoDB in Docker:**

     ```bash
     npm install
     docker compose up -d mongodb
     npm run dev
     ```

3. **Create the default admin** (safe to run more than once):

   ```bash
   docker compose exec app npm run migrate:admin   # API in Docker
   npm run migrate:admin                            # API on your machine
   ```

4. **(Optional) Seed sample data** (replaces existing cars, bookings, cards and non-admin users):

   ```bash
   npm run seed:cars                               # API in Docker
   node src/seed/cars.js                           # API on your machine
   ```

The API runs at `http://localhost:3000/api/v2`, with Swagger docs at `http://localhost:3000/api-docs`.

## Frontend

All commands below run from `frontend/`. Start the backend first.

1. **Configure environment variables** (optional — the defaults work locally):

   ```bash
   cd frontend
   cp .env.example .env
   ```

   - `VITE_API_URL` — base URL for API calls (default `/api/v2`, served through the dev proxy).
   - `VITE_BACKEND_URL` — where the dev server forwards `/api` requests (default `http://localhost:3000`).

2. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`.

Other scripts:

| Command              | What it does                    |
|----------------------|---------------------------------|
| `npm run build`      | Production build into `dist/`   |
| `npm run preview`    | Serve the production build      |
| `npm test`           | Run unit and component tests once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode    |
| `npm run lint`       | Check code with ESLint          |
| `npm run lint:fix`   | Fix ESLint issues automatically |
| `npm run format`     | Format code with Prettier       |
| `npm run format:check` | Check formatting without changing files |
| `npm run test:e2e`   | End-to-end checks with Playwright (see below) |
| `npm run test:e2e:report` | Open the last end-to-end report |

### Using the app

- Visitors can only open `/auth` (sign in / register); every other page redirects there and comes back after signing in.
- Users: **Fleet** (`/fleet` — filters, map, quick booking), **car page** (`/cars/:id` — book now or schedule up to 7 days ahead), **My Trips** (`/trips`), **My Profile** (`/profile`). Users can't finish or cancel trips; the app points them to support.
- Admins also get the **admin console** (`/admin`): KPIs, the fleet (add / edit / remove cars, maintenance actions), trips and bookings (create, edit, complete, delete) and users (view, edit, delete), plus CSV export. Sign in with the account created by `migrate:admin`.

### End-to-end checks (Playwright)

They run against the real stack, so start the backend in Docker first (with the admin migration run and sample data seeded). The dev server is started automatically if it isn't running.

```bash
npx playwright install chromium   # once
npm run test:e2e
```

- **Layout** (`e2e/layout.spec.js`): every screen at 375, 1024 and 1440 px — no serious accessibility violations (axe, WCAG 2.1 AA), one `h1`, no sideways page scrolling. Full-page screenshots are attached to the report.
- **Journeys** (`e2e/journeys.spec.js`): guest redirect, sign up → book → My Trips → admin completes the trip → car free again, admin adds / edits / removes a car, keyboard focus.
- **Endpoints** (`e2e/api-coverage.spec.js`): all 23 API endpoints with the access rules and backend behaviours the frontend relies on.

The admin login comes from `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, or from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`. Every run creates its own `e2e.*@carshes.test` user and test car and removes them at the end. The endpoint check also runs the two maintenance actions, which change matching cars in the database — re-seed to get the sample data back.

## Claude Code: MongoDB MCP

`.mcp.json` registers a read-only [MongoDB MCP server](https://github.com/mongodb-js/mongodb-mcp-server) so Claude Code can query the local database. Before starting Claude Code, set the connection string (MongoDB must be running):

```powershell
# PowerShell
$env:MDB_MCP_CONNECTION_STRING = "mongodb://<user>:<password>@localhost:27018/carshes?authSource=admin"
```

```bash
# bash / zsh
export MDB_MCP_CONNECTION_STRING="mongodb://<user>:<password>@localhost:27018/carshes?authSource=admin"
```

Use the `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` values from `backend/.env`. On macOS or Linux, change `"command": "cmd"` in `.mcp.json` to `"npx"` and drop the `"/c"` argument.

## Project structure

```
.
├── backend/
│   ├── src/                 # routes, controllers, services, models, middleware, migrations
│   ├── docker-compose.yaml
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # axios instance, session interceptors, one wrapper per resource
│   │   ├── components/      # admin, auth, booking, cars, common, layout, profile, trips
│   │   ├── layouts/         # auth, app and admin page chrome
│   │   ├── router/          # routes and access guards
│   │   ├── store/           # Vuex modules (auth, cars, carDetails, bookings, geo, admin/*)
│   │   ├── styles/          # Tailwind entry and design tokens
│   │   ├── utils/           # formatting, derived values, filters, CSV, geo helpers
│   │   └── views/           # one per route
│   ├── e2e/                 # Playwright checks against the running stack
│   ├── playwright.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```
