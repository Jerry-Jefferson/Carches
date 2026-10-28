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
| `npm test`           | Run unit tests once (Vitest)    |
| `npm run test:watch` | Run unit tests in watch mode    |
| `npm run lint`       | Check code with ESLint          |
| `npm run lint:fix`   | Fix ESLint issues automatically |
| `npm run format`     | Format code with Prettier       |
| `npm run format:check` | Check formatting without changing files |

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
│   │   ├── api/             # axios instance
│   │   ├── router/          # Vue Router
│   │   ├── store/           # Vuex store
│   │   ├── styles/          # Tailwind entry
│   │   └── views/
│   ├── vite.config.js
│   └── package.json
└── README.md
```
