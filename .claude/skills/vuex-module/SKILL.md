---
name: vuex-module
description: How to scaffold a new namespaced Vuex 4 module in the Carshes frontend with actions that call the API wrappers in src/api/*.js (built on the shared axios instance in @/api/http.js), register it in the store, use it from Options API components via mapState/mapGetters/mapActions, and test it. Use when adding app state or API calls to the frontend.
---

# Adding a Vuex 4 module (Carshes frontend)

Work inside `frontend/`. One module per backend resource or feature: `auth`, `cars`, `carDetails`, `bookings`, `geo`, and the nested `admin/*` modules. Look at `src/store/modules/cars.js` and `bookings.js` for complete examples.

## 1. Add the API call to a wrapper

Components and stores never build requests themselves. Each endpoint has a thin wrapper in `src/api/<resource>.js` (`auth`, `users`, `cars`, `bookings`) on the shared axios instance:

```js
import http, { unwrap } from './http'

export const list = () => http.get('/cars').then(unwrap)
export const getById = (id) => http.get(`/cars/${id}`).then(unwrap)
```

- `unwrap` turns the backend envelope `{ message, data }` into `data`.
- Paths are relative to the axios base URL (`VITE_API_URL`, default `/api/v2`); never hardcode `/api/v2` and never import `axios` directly.
- The Bearer token and the 401 → `/auth?redirect=…` handling are added by the interceptors in `src/api/session.js`; don't pass headers yourself. A request that must not trigger the redirect passes `{ skipAuthRedirect: true }` as axios config.
- Failed requests are normalised in `http.js`: `err.message` is the backend message (or "Network error. Check your connection.") and `err.statusCode` the HTTP status. Read it with `getErrorMessage(err)`.

## 2. Create the module

`src/store/modules/<name>.js` — namespaced, `state` as a function, mutations in `UPPER_SNAKE_CASE`, API calls only in actions:

```js
import * as carsApi from '@/api/cars'
import { getErrorMessage } from '@/api/http'

export default {
  namespaced: true,
  state: () => ({
    items: [],
    isLoading: false,
    error: null,
  }),
  getters: {
    freeCars: (state) => state.items.filter((car) => car.status === 'free'),
  },
  mutations: {
    SET_ITEMS(state, items) {
      state.items = items
    },
    SET_LOADING(state, isLoading) {
      state.isLoading = isLoading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
  },
  actions: {
    async fetchCars({ commit }) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      try {
        const cars = (await carsApi.list()) ?? []
        commit('SET_ITEMS', cars)
        return cars
      } catch (err) {
        commit('SET_ERROR', getErrorMessage(err))
        throw err
      } finally {
        commit('SET_LOADING', false)
      }
    },
  },
}
```

Rules:
- Re-throw after storing the error so the calling component can react (show a message, stay on the form).
- The store is **strict in dev**: state may only change inside mutations. Never mutate objects you got from state (copy them first) and never assign state in actions.
- Never send a user ID for "my" data — `/users/me` and `/bookings/my` take it from the token. For `POST /bookings`, the backend overrides `userId` for non-admins.
- Per-user data must be cleared on sign-out: add a `RESET` mutation and commit it from the `resetOnSignOut` plugin in `src/store/index.js` (it listens for `auth/CLEAR_SESSION`). A request still in flight at sign-out must not refill the state afterwards: note `rootState.auth?.token` before the await and drop the result if it changed (see `bookings/fetchMine`).
- Data for "the current page" (one car, one booking) must ignore out-of-order responses: record the requested id and a request counter in state (via a mutation) and commit only if they still match after the await (see `carDetails/fetchCar`).
- Short caches (`loadedAt` + `CACHE_MS`, with a `{ force }` option) avoid repeat calls when several views need the same list — see `cars.js`.
- Pure logic (filters, sorting, KPIs) belongs in `src/utils/*.js` with its own tests; getters just call it.

## 3. Register it

`src/store/index.js`:

```js
import { createStore } from 'vuex'
import cars from './modules/cars'

export default createStore({
  strict: import.meta.env.DEV,
  modules: {
    cars,
  },
  plugins: [resetOnSignOut],
})
```

Nested modules (like `admin`) are a namespaced module with `modules: { … }`; they are addressed as `admin/fleet/createCar` and `rootState.admin.trips.items`.

## 4. Use it in an Options API component

```vue
<script>
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  name: 'CarListView',
  computed: {
    ...mapState('cars', ['items', 'isLoading', 'error']),
    ...mapGetters('cars', ['freeCars']),
  },
  created() {
    this.loadCars()
  },
  methods: {
    ...mapActions('cars', ['fetchCars']),
    async loadCars() {
      try {
        await this.fetchCars()
      } catch {
        
      }
    },
  },
}
</script>

<template>
  <a-spin :spinning="isLoading">
    <a-alert v-if="error" type="error" :message="error" show-icon class="mb-4" />
    <p class="text-muted-foreground">{{ freeCars.length }} of {{ items.length }} cars are free</p>
  </a-spin>
</template>
```

- `mapState` / `mapGetters` go in `computed`, `mapActions` / `mapMutations` in `methods`, always with the module namespace as the first argument.
- For form-bound fields from the store, use a computed with `get` / `set` that commits a mutation — never `v-model` straight onto store state (strict mode will throw).

## 5. Test it

`src/store/modules/__tests__/<name>.spec.js` — mock the API wrapper, use a real store:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'

import * as carsApi from '@/api/cars'
import cars from '../cars'

vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))

const makeStore = () => createStore({ strict: true, modules: { cars } })

describe('cars module', () => {
  beforeEach(() => {
    vi.mocked(carsApi.list).mockReset()
  })

  it('fetchCars stores items', async () => {
    vi.mocked(carsApi.list).mockResolvedValue([
      { _id: 'a', status: 'free' },
      { _id: 'b', status: 'in_use' },
    ])
    const store = makeStore()
    await store.dispatch('cars/fetchCars')

    expect(carsApi.list).toHaveBeenCalledTimes(1)
    expect(store.state.cars.items).toHaveLength(2)
    expect(store.getters['cars/freeCars']).toHaveLength(1)
  })

  it('fetchCars stores the API error message', async () => {
    const apiError = Object.assign(new Error('Authorization header is missing'), {
      statusCode: 401,
    })
    vi.mocked(carsApi.list).mockRejectedValue(apiError)
    const store = makeStore()

    await expect(store.dispatch('cars/fetchCars')).rejects.toBe(apiError)
    expect(store.state.cars.error).toBe('Authorization header is missing')
    expect(store.state.cars.isLoading).toBe(false)
  })
})
```

- Mock every wrapper function the module (and the modules it dispatches to) can call, or the call returns `undefined`.
- `beforeEach` must use braces. `beforeEach(() => vi.mocked(carsApi.list).mockReset())` returns the mock, Vitest treats it as a teardown function and calls it again after the test — with a rejecting mock that fails the test with the API error.
- Use `strict: true` in tests so illegal state mutations are caught.
- Modules that read other modules (`rootState.geo`, `rootGetters['cars/byId']`, `admin/*`) need those modules in the test store too.

## 6. Finish

From `frontend/`: `npm run lint && npm run format:check && npm test`.
