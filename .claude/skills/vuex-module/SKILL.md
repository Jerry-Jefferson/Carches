---
name: vuex-module
description: How to scaffold a new namespaced Vuex 4 module in the Carshes frontend with actions that call the shared axios instance (@/api/http.js), register it in the store, use it from Options API components via mapState/mapGetters/mapActions, and test it. Use when adding app state or API calls to the frontend.
---

# Adding a Vuex 4 module (Carshes frontend)

Work inside `frontend/`. One module per backend resource or feature: `cars`, `bookings`, `auth`, `users`.

## 1. Create the module

`src/store/modules/<name>.js` — namespaced, `state` as a function, mutations in `UPPER_SNAKE_CASE`, API calls only in actions:

```js
import http from '@/api/http'

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
        const { data } = await http.get('/cars')
        commit('SET_ITEMS', data.data)
      } catch (err) {
        commit('SET_ERROR', err.response?.data?.message ?? err.message)
        throw err
      } finally {
        commit('SET_LOADING', false)
      }
    },
  },
}
```

Rules:
- **Always `import http from '@/api/http'`** — never `axios` directly, never a hardcoded `/api/v2` (the base URL comes from `VITE_API_URL`). Paths are relative to it: `'/cars'`, `'/bookings/my'`, `'/users/me'`.
- Backend responses are `{ message, data }` → use `data.data`. Errors are `{ status, statusCode, message }` → `err.response?.data?.message`.
- Re-throw after storing the error so the calling component can react (show a message, stay on the form).
- The store is **strict in dev**: state may only change inside mutations. Never mutate objects you got from state (copy them first) and never assign state in actions.
- Never send a user ID for "my" data — `/users/me` and `/bookings/my` take it from the token. For `POST /bookings`, the backend overrides `userId` for non-admins.
- Authentication: `http.js` does **not** attach a token yet. When the first protected call is added, put an `Authorization: Bearer <token>` request interceptor in `src/api/http.js` (reading the token from the store/auth module) rather than passing headers in each action.

## 2. Register it

`src/store/index.js`:

```js
import { createStore } from 'vuex'
import cars from './modules/cars'

export default createStore({
  strict: import.meta.env.DEV,
  modules: {
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

`src/store/modules/__tests__/<name>.spec.js` — mock the HTTP instance, use a real store:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'
import http from '@/api/http'
import cars from '../cars'

vi.mock('@/api/http', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const makeStore = () => createStore({ strict: true, modules: { cars } })

describe('cars module', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
  })

  it('fetchCars stores items', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: { data: [{ vin: 'A', status: 'free' }, { vin: 'B', status: 'in_use' }] },
    })
    const store = makeStore()
    await store.dispatch('cars/fetchCars')

    expect(http.get).toHaveBeenCalledWith('/cars')
    expect(store.state.cars.items).toHaveLength(2)
    expect(store.getters['cars/freeCars']).toHaveLength(1)
  })

  it('fetchCars stores the API error message', async () => {
    const apiError = Object.assign(new Error('Request failed with status code 401'), {
      response: { data: { message: 'Authorization header is missing' } },
    })
    vi.mocked(http.get).mockRejectedValue(apiError)
    const store = makeStore()

    await expect(store.dispatch('cars/fetchCars')).rejects.toBe(apiError)
    expect(store.state.cars.error).toBe('Authorization header is missing')
    expect(store.state.cars.isLoading).toBe(false)
  })
})
```

- `beforeEach` must use braces. `beforeEach(() => vi.mocked(http.get).mockReset())` returns the mock, Vitest treats it as a teardown function and calls `http.get` again after the test — with a rejecting mock that fails the test with the API error.
- Use `strict: true` in tests so illegal state mutations are caught.
- Mock errors as real `Error` objects with a `response` property, like axios produces.

## 5. Finish

From `frontend/`: `npm run lint && npm run format:check && npm test`.
