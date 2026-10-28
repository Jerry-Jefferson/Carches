---
name: docker-workflow
description: Common Docker Compose commands for the Carshes backend - start/stop, rebuild after code or dependency changes, follow logs, open a Mongo shell, run the admin migration and seed data inside the container, and when to use npm run seed:cars versus node src/seed/cars.js. Use for any task that runs, restarts or inspects the backend containers.
---

# Docker workflow (Carshes backend)

All commands run from `backend/` (that's where `docker-compose.yaml` and `.env` live).

## Services

| Service | Image | Host port | Notes |
|---------|-------|-----------|-------|
| `app` | built from `backend/Dockerfile` (`node:22-alpine`, `npm ci`, `COPY . .`) | `3000` | waits for `mongodb` to be healthy; `restart: unless-stopped` |
| `mongodb` | `mongo:latest` | `27018` → container `27017` | data in the `mongo_data` volume |

Both read `backend/.env`.

## Start / stop

```bash
docker compose up -d                 # start everything (builds app on first run)
docker compose up -d mongodb         # only MongoDB (API runs on the host with npm run dev)
docker compose ps                    # status + health
docker compose stop                  # stop, keep containers and data
docker compose down                  # remove containers, keep data
docker compose down -v               # remove containers AND the database volume (all data lost)
```

## Rebuild

There is **no bind mount**: the `app` image contains a copy of the code from build time. Rebuild after:

- any change in `src/` (the container does not see host edits),
- any change to `package.json` / `package-lock.json` (dependencies are installed by `npm ci` at build time),
- changes to `Dockerfile` or `.dockerignore`.

```bash
docker compose up -d --build app            # rebuild and restart only the API
docker compose build --no-cache app          # full rebuild if npm ci seems stale
docker compose up -d app
```

`.env` changes don't need a rebuild, but the container must be recreated: `docker compose up -d --force-recreate app`.

After adding a dependency: run `npm install <pkg>` on the host (updates the lockfile), then rebuild. Never copy `node_modules` into the image — `.dockerignore` excludes it so Linux binaries are built in the container.

## Logs

```bash
docker compose logs -f app                   # follow API logs (Ctrl+C to detach; container keeps running)
docker compose logs --tail=100 app           # last 100 lines
docker compose logs -f mongodb               # database logs
```

Startup failures to look for: `JWT_SECRET must be defined and at least 32 characters long`, `BCRYPT_SALT_ROUNDS must be an integer between 10 and 15`, `MongoDB connection error`. `restart: unless-stopped` makes a crashing app restart in a loop — check `docker compose ps` and the logs.

## Shell access

```bash
docker compose exec app sh                   # shell in the API container
docker compose exec mongodb sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin carshes'
```

The second command uses the credentials already set inside the container, so they never appear in shell history. Useful one-liners in mongosh:

```js
db.users.find({}, { email: 1, role: 1, isDeleted: 1 })
db.users.updateOne({ email: 'someone@example.com' }, { $set: { role: 'admin' } })
db.revokedtokens.countDocuments()
```

## Migrations

```bash
docker compose exec app npm run migrate:admin
```

Idempotent: re-running when the admin exists is a no-op. Requires the `ADMIN_*` variables in `.env` (password 12+ chars). If `.env` changed, recreate the container first so it sees the new values.

## Seeding: `npm run seed:cars` vs `node src/seed/cars.js`

Both run the same file and **replace** all cars, production info, bookings, credit cards and non-admin users (admins are kept). Seeded users share `SEED_USER_PASSWORD` (default `Password123!`).

| | `npm run seed:cars` | `node src/seed/cars.js` |
|---|---|---|
| Run from | host, in `backend/` | host, in `backend/` (or inside the container) |
| Where it executes | inside the `app` container (`docker compose exec app npm run seed:cars:inner`) | on the host |
| Code it runs | the copy baked into the image — **rebuild first** if the seeder or models changed | the files on disk |
| Database address | container `.env` → `DATABASE_URI` with host `mongodb:27017` | host `.env` → `DATABASE_URI` must use `localhost:27018` |
| Needs | `app` container running | `npm install` on the host, MongoDB reachable on `27018` |

Rule of thumb: API in Docker → `npm run seed:cars`. API on the host (`npm run dev`) → `node src/seed/cars.js`.

The same `DATABASE_URI` caveat applies to `npm run dev` and `npm run migrate:admin` on the host: `mongodb:27017` only resolves inside the Compose network.

## Reset everything

```bash
docker compose down -v
docker compose up -d --build
docker compose exec app npm run migrate:admin
npm run seed:cars
```

Use this after schema changes that leave old documents incompatible (e.g. the driver → user merge).
