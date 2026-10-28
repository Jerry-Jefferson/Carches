---
name: swagger-update
description: Focused guide for editing backend/src/swagger.json in Carshes - adding or changing paths, request/response schemas, reusable responses, the bearer auth security scheme and role notes, then validating the spec. Use whenever a backend route, request body or response shape changes.
---

# Updating `swagger.json` (Carshes backend)

The OpenAPI spec is **hand-maintained** in `backend/src/swagger.json` (OpenAPI `3.0.0`) and served by `swagger-ui-express` at `http://localhost:3000/api-docs`. Nothing is generated from code — every route change needs a matching spec change in the same task.

## Structure you are editing

| Key | Contents |
|-----|----------|
| `servers` | `http://localhost:3000/api/v2` — paths below are **relative** to it (`/cars`, not `/api/v2/cars`) |
| `tags` | `Auth`, `Cars`, `Users`, `Bookings` |
| `security` | global `[{ "bearerAuth": [] }]` — every operation requires a JWT unless it overrides this |
| `components.securitySchemes.bearerAuth` | `http` / `bearer` / `JWT` |
| `components.responses` | `Unauthorized` (401, several examples), `Forbidden` (403) |
| `components.schemas` | `User`, `Car`, `CarWithProductionInfo`, `ProductionInfo`, `ProductionInfoInput`, `GeoPoint`, `Booking`, `BookingWithCar`, `SignUpRequest`, `SignInRequest`, `AuthResponse`, `ReservedCarUnauthorized`, `UpdateResult`, `SuccessResponse`, `ErrorResponse` |

Path parameters use OpenAPI braces: Express `/cars/:id` → spec `/cars/{id}`.

## Edit safely

The file is large; prefer a small Node script over hand-editing JSON:

```bash
cd backend
node -e '
const fs = require("fs")
const f = "src/swagger.json"
const s = JSON.parse(fs.readFileSync(f, "utf8"))
// ...modify s...
fs.writeFileSync(f, JSON.stringify(s, null, 2) + "\n")
'
npx prettier --write src/swagger.json
```

`s.paths` is an ordinary object: to place a new path next to related ones (Swagger UI shows them in file order), rebuild it with `Object.entries` and insert where needed.

## Adding an operation

Template for a protected, user-level endpoint:

```json
"/bookings/my": {
  "get": {
    "summary": "Get my bookings",
    "description": "Returns all bookings of the authenticated user, newest first.\n\n**Required role:** `user` (admins also allowed).",
    "tags": ["Bookings"],
    "responses": {
      "200": {
        "description": "Successfully retrieved bookings",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "message": { "type": "string", "example": "Successfully retrieved your bookings" },
                "data": { "type": "array", "items": { "$ref": "#/components/schemas/BookingWithCar" } }
              }
            }
          }
        }
      },
      "401": { "$ref": "#/components/responses/Unauthorized" },
      "500": {
        "description": "Internal server error",
        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } }
      }
    }
  }
}
```

Checklist for every operation:
- `summary`, `description`, one `tags` entry.
- Description ends with the role line, matching the route's middleware:
  - `requireUser` → `**Required role:** \`user\` (admins also allowed).`
  - `requireAdmin` → `**Required role:** \`admin\`.` **and** add `"403": { "$ref": "#/components/responses/Forbidden" }`.
- `401` → `#/components/responses/Unauthorized` on every protected operation.
- Success body is `{ message, data }` — copy the real `message` string from the controller. `204` responses have no `content`.
- Errors use `#/components/schemas/ErrorResponse` with an `example` holding the exact message thrown by the service (`{ "status": "error", "statusCode": 404, "message": "Car not found" }`). Mongoose validation and duplicate-key errors surface as `400`; auth conflicts as `409`.
- Path parameters:
  ```json
  "parameters": [{
    "name": "id", "in": "path", "required": true,
    "description": "Car ID (24-character hex MongoDB ObjectId)",
    "schema": { "type": "string", "pattern": "^[a-fA-F0-9]{24}$", "example": "64a1b2c3d4e5f6a7b8c9d0e1" }
  }]
  ```
  Query parameters use `"in": "query"` and are usually `"required": false` with a `default`.
- Request body: `"requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/…" } } } }`, listing `required` fields and `minLength` / `maxLength` / `pattern` / `enum` that mirror the Mongoose schema and validation middleware.

## Public endpoints

Public operations (only `POST /auth/signup` and `POST /auth/signin` today) override the global requirement with an empty array:

```json
"security": []
```

Don't remove the global `security` block or the `bearerAuth` scheme — Swagger UI's **Authorize** button depends on them.

## Schemas

- Add reusable shapes under `components.schemas` and reference them with `$ref`; inline only one-off wrappers like `{ message, data }`.
- Keep schemas in sync with `backend/src/models/*.model.js`: field names (`userId`, `carId`, `licenseNumber` — there is no `driverId`), `enum` values (car `status`: `free`, `reserved`, `in_use`, `unavailable`, `in_service`; user `role`: `user`, `admin`), and the `required` list.
- Never expose `password` in response schemas. Mark write-only or server-managed fields in the description (e.g. `userId` on `POST /bookings` is ignored for non-admins).
- For populated references, compose instead of duplicating:
  ```json
  "BookingWithCar": {
    "allOf": [
      { "$ref": "#/components/schemas/Booking" },
      { "type": "object", "properties": { "carId": { "$ref": "#/components/schemas/Car" } } }
    ]
  }
  ```

## Removing or renaming

- Removing a route: delete the operation; delete the path key if no operations remain.
- Renaming a path or field: search the whole file for the old name, including descriptions and examples.
- Remove schemas that are no longer referenced (`grep -c '#/components/schemas/Name' src/swagger.json`).

## Validate

From `backend/`:

```bash
npx -y @apidevtools/swagger-cli validate src/swagger.json   # must print "src/swagger.json is valid"
npx prettier --check src/swagger.json
```

Then open `http://localhost:3000/api-docs` (rebuild the container first if the API runs in Docker — see the `docker-workflow` skill) and check that the operation appears under the right tag with the lock icon (or without it for public routes).
