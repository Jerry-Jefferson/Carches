---
name: vuex-module
description: How to scaffold a new namespaced Vuex 4 module in the Carshes frontend with actions that call the endpoint modules in src/api/ (which use the shared axios instance @/api/http.js), register it in the store, use it from Options API components via mapState/mapGetters/mapActions, and test it. Use when adding app state or API calls to the frontend.
---

# Adding a Vuex 4 module (Carshes frontend)

Work inside `frontend/`. One module per backend resource or feature: `cars`, `bookings`, `auth`, `users`.

## 1. Create the module

Endpoint functions live in `src/api/<resource>.js` (`auth`, `users`, `cars`, `bookings` already exist — add to them before creating a new file). They call the shared instance and return the unwrapped `data`:

```js
// src/api/cars.js
import http, { unwrap } from './http'

export const list = () => http.get('/cars').then(unwrap)
```

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
        commit('SET_ITEMS', await carsApi.list())
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
- **Actions call `src/api/*` functions**, never `axios` or `http` directly, never a hardcoded `/api/v2` (the base URL comes from `VITE_API_URL`). API paths are relative to it: `'/cars'`, `'/bookings/my'`, `'/users/me'`.
- API functions return the `data` of the `{ message, data }` envelope (`unwrap`). The interceptor in `http.js` puts the backend message on `err.message` and the status on `err.statusCode` → store `getErrorMessage(err)`.
- Re-throw after storing the error so the calling component can react (show a message, stay on the form).
- The store is **strict in dev**: state may only change inside mutations. Never mutate objects you got from state (copy them first) and never assign state in actions.
- Never send a user ID for "my" data — `/users/me` and `/bookings/my` take it from the token. For `POST /bookings`, the backend overrides `userId` for non-admins.
- Authentication is automatic: `installSession` (`src/api/session.js`, called in `main.js`) sends the `auth` store token as `Authorization: Bearer …` and handles 401s globally. Never pass auth headers in actions. Pass `{ skipAuthRedirect: true }` as axios config only for calls that handle a 401 themselves.
- Keep `isLoading` for list loads and `isSubmitting` for create/update/delete; components show `ErrorState` / `notify.apiError` (see CLAUDE.md §4 Frontend).

## 2. Register it

`src/store/index.js`:

```js
import { createStore } from 'vuex'
import auth from './modules/auth'
import cars from './modules/cars'

export default createStore({
  strict: import.meta.env.DEV,
  modules: {
    auth,
    cars,
  },
})
```

## 3. Use it in an Options API component

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
        // error is already in state.cars.error and rendered below
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

## 4. Test it

`src/store/modules/__tests__/<name>.spec.js` — mock the API module, use a real store (`auth.spec.js` is a full example):

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'
import * as carsApi from '@/api/cars'
import cars from '../cars'

vi.mock('@/api/cars', () => ({ list: vi.fn() }))

const makeStore = () => createStore({ strict: true, modules: { cars } })

describe('cars module', () => {
  beforeEach(() => {
    vi.mocked(carsApi.list).mockReset()
  })

  it('fetchCars stores items', async () => {
    vi.mocked(carsApi.list).mockResolvedValue([
      { vin: 'A', status: 'free' },
      { vin: 'B', status: 'in_use' },
    ])
    const store = makeStore()
    await store.dispatch('cars/fetchCars')

    expect(carsApi.list).toHaveBeenCalled()
    expect(store.state.cars.items).toHaveLength(2)
    expect(store.getters['cars/freeCars']).toHaveLength(1)
  })

  it('fetchCars stores the API error message', async () => {
    // Shaped like an error after the http.js interceptor: message = backend message
    const apiError = Object.assign(new Error('Authorization header is missing'), {
      statusCode: 401,
      response: { data: { message: 'Authorization header is missing' } },
    })
    vi.mocked(carsApi.list).mockRejectedValue(apiError)
    const store = makeStore()

    await expect(store.dispatch('cars/fetchCars')).rejects.toBe(apiError)
    expect(store.state.cars.error).toBe('Authorization header is missing')
    expect(store.state.cars.isLoading).toBe(false)
  })
})
```

- `beforeEach` must use braces. `beforeEach(() => vi.mocked(carsApi.list).mockReset())` returns the mock, Vitest treats it as a teardown function and calls the mock again after the test — with a rejecting mock that fails the test with the API error.
- Use `strict: true` in tests so illegal state mutations are caught.
- Mock errors as real `Error` objects with a `response` property, like axios produces.

## 5. Finish

From `frontend/`: `npm run lint && npm run format:check && npm test`.
