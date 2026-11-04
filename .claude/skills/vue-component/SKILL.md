---
name: vue-component
description: Step-by-step recipe for creating a new Vue component in the Carshes frontend - Options API skeleton, design-system color tokens, Ant Design Vue usage, VeeValidate + Zod form pattern, and a Vitest test file. Use whenever adding or rewriting a .vue file in frontend/src.
---

# Creating a Vue component (Carshes frontend)

Work inside `frontend/`. Read `CLAUDE.md` §8.2–8.3 if anything below is unclear.

## 1. Pick the location and name

The frontend follows MVVM (CLAUDE.md §4): **views** are the smart containers (store, route), **components** are the pieces they are built from, the Vuex **store** is the view-model, **services** talk to the API.

| Kind | Folder | Example |
|------|--------|---------|
| Routed page (smart: reads the store, dispatches actions, reacts to the route) | `src/views/` | `views/CarListView.vue` |
| Layout wrapping routed pages (picked by `route.meta.layout`) | `src/views/layouts/` | `views/layouts/AppLayout.vue` |
| Piece of one area's screens | `src/components/<area>/` — `auth`, `cars`, `bookings`, `profile`, `admin` | `components/auth/LoginForm.vue` |
| Generic piece, no domain logic, used across areas | `src/components/common/` | `components/common/StatusTag.vue` |
| App chrome inside the layouts (header, nav, sidebar, footer) | `src/components/layout/` | `components/layout/AppHeader.vue` |

- Keep components presentational where you can: data in through props, changes out through events, the view does the store work. A component that needs the store anyway (a form that dispatches, an admin section) uses the same map helpers as a view. Components never import a view; `utils/` and `services/` never import components.
- Import across folders with `@/` (`@/components/common/StatusTag.vue`), relative paths only inside a folder (tests import with `@/`). Import every own component explicitly: `vite.config.js` sets `dirs: []` so `unplugin-vue-components` does **not** auto-register `src/components/` (that would turn tags into static imports and break lazy ones, CLAUDE.md gotcha #17). Don't remove `dirs: []`.
- Don't put new files in the root of `src/` (only `main.js` and `App.vue` live there). Static text such as the brand name or support contacts is written directly in the template.
- PascalCase, **multi-word** names (`vue/multi-word-component-names` is an error).
- A new view also needs an entry in `ROUTES` (`src/router/routes.constants.js`, always both keys: `CAR_LIST: { PATH: '/cars', NAME: 'car-list' }`) and a lazy route in `src/router/index.js`:
  `{ path: ROUTES.CAR_LIST.PATH, name: ROUTES.CAR_LIST.NAME, component: () => import('@/views/CarListView.vue'), meta: { title: 'Cars' } }` — add it **before** the catch-all `/:pathMatch(.*)*`. `meta.title` sets the document title; add `requiresAuth: true` to every page signed-in users only may open (all of them except `/auth`, which has `guestOnly: true`), `layout: 'auth' | 'admin'` (default `app`) and `roles: ['admin']` when the page needs them. `tests/unit/router/index.spec.js` checks that every page has exactly one of `requiresAuth` / `guestOnly`. `tests/unit/router/routes.spec.js` checks that every `ROUTES` entry has a route with the same path and name. A page with tabs in the query adds its values to `TAB_NAMES` (`TAB_NAMES.ADMIN.FLEET`).
- Navigate by name, never with a string or a path: import `ROUTES` directly in the component (`import { ROUTES } from '@/router/routes.constants'`) and use `ROUTES.FLEET.NAME` (`this.$router.push({ name: ROUTES.MY_TRIPS.NAME })`). `PATH` is for the route table only. In a template, go through a computed (`:to="fleetRoute"` with `fleetRoute() { return { name: ROUTES.FLEET.NAME } }`) — templates can't read imports; a template that needs many names can return `ROUTES` from `data()`.
- A heavy child that should load on demand (maps, charts) is registered under a **different** name than its file: `components: { LazyFleetMap: defineAsyncComponent(() => import('@/components/cars/FleetMap.vue')) }` and `<LazyFleetMap>` in the template (see `views/FleetView.vue`).

## 2. Options API skeleton

Options API only — `<script setup>`, `setup()` and Composition API functions fail lint (`vue/component-api-style`).

```vue
<script>
export default {
  name: 'CarCard',
  components: {},
  props: {
    car: { type: Object, required: true },
  },
  emits: ['select'],
  data() {
    return {
      isExpanded: false,
    }
  },
  computed: {
    title() {
      return `${this.car.productionInfo?.brand} ${this.car.productionInfo?.model}`
    },
  },
  watch: {},
  mounted() {},
  methods: {
    select() {
      this.$emit('select', this.car)
    },
  },
}
</script>

<template>
  <a-card :title="title" class="bg-card text-card-foreground">
    <p class="text-muted-foreground">{{ car.registrationNumber }}</p>
    <a-button type="primary" @click="select">Book</a-button>
  </a-card>
</template>
```

Rules:
- Option order: `name, components, props, emits, data, computed, watch, lifecycle hooks, methods`.
- Always declare `emits`; props use the object syntax with `type` (and `required` / `default`).
- Store, router, HTTP: `mapGetters` / `mapActions` (see the `vuex-module` skill), `this.$router`, `this.$route`. `mapState` is banned by ESLint: to read a state field, map the module's getter of the same name (add `field: (state) => state.field` to the module if it is missing). Never call `axios` or `@/services/*` from a component — go through a Vuex action (it calls the `src/services/*.js` wrappers).
- Comments and UI text in English.

## 3. Styling with the design system

- Colors **only** from tokens: `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-popover`, `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground`, `bg-secondary`, `hover:bg-secondary-hover`, `text-secondary-foreground`, `bg-muted`, `text-muted-foreground`, `text-link` (accent text and links — not `text-secondary`/`text-secondary-hover`, which fail contrast as text), `bg-accent`, `text-accent-foreground`, `bg-surface`, `border-border`, `border-input`, `ring-ring`; status colours `destructive`, `success`, `warning`, `info` (+ `-foreground`, soft backgrounds via `bg-success/15`). Status labels/tones come from `@/utils/derive` (`carStatusMeta`, `bookingStatusMeta`, `fuelTone`); display values from `@/utils/format`.
- Typography and shape from the theme: `text-headline-sm`, `text-body-md`, `text-label-sm uppercase`, …; `rounded-control` / `rounded-card` / `rounded-dialog`; `shadow-card` / `shadow-popover`.
- Never `text-gray-500`, `bg-blue-600`, hex or `rgb()` values. Opacity works: `bg-primary/50`.
- Dark mode: tokens switch automatically with `.dark` on `<html>`; use `dark:` only for layout differences, not colors.
- Tailwind for layout/spacing (`flex`, `gap-4`, `p-6`, `grid`), Ant Design for controls.
- Utilities are `!important` and Preflight is off — don't add `!` prefixes or global resets.
- Need a new color? Add the token in `src/assets/styles/design-system.css` (`:root` **and** `.dark`), map it in `@theme inline` in `src/assets/styles/main.css`, and in `TOKEN_MAP` in `src/assets/styles/antd.js` if Ant Design should use it.

## 4. Ant Design Vue

- Components are auto-imported (`unplugin-vue-components`): write `<a-button>`, `<a-table>`, `<a-modal>` with no import.
- Icons from `@ant-design/icons-vue` are auto-imported too (`resolveIcons: true`): write `<CarOutlined />` in the template with no import or `components` entry. An icon used from JavaScript (in `data()`, a list of tabs, `:icon="…"`) must be imported explicitly (`import { LoginOutlined } from '@ant-design/icons-vue'`, see `components/auth/AuthTabs.vue`).
- Ant Design colors come from the design tokens via `ConfigProvider` in `App.vue` — don't pass `color` props or override `.ant-*` classes for color.
- `v-model` on Ant Design inputs is `v-model:value`, not `v-model`.
- Danger actions are never solid: Ant Design writes text on solid fills with `colorTextLightSolid` = the dark `primary-foreground`, which is unreadable on red. Use `<a-button danger>` (no `type="primary"`), and `ok-type="default"` on an `a-popconfirm` / `a-modal` whose `ok-button-props` has `danger: true`. `tests/unit/assets/styles/dangerButtons.spec.js` enforces this.
- `a-select` drops `aria-label`. Name it with `html-for="x"` on the `a-form-item` plus `id="x"` on the select, or wrap it in a `<label>` (visible or `sr-only`).
- Async results in components (a check run when a modal opens, a debounced route update) must still apply when they land: keep a request counter or re-check the route / props before using them.
- A failed load is never shown as an empty state ("No alerts", "Nothing here"): render the stored error with a Retry action instead.
- Defaults such as "now" belong to the moment a modal opens, not to a cached computed: refresh them in an `open` watcher.
- `aria-label` on a plain `<span>` / `<div>` is ignored by screen readers. Make the visible text clear on its own, or pair an `aria-hidden="true"` visual (`1 / 2`) with `sr-only` text (`1 completed of 2 trips`).
- A component rendered twice on one page (inline + in a drawer) must not use fixed `id`s: build them from a module-level counter in `data()`.
- Copy to the clipboard with `copyText()` from `@/utils/clipboard` (`navigator.clipboard` is missing on non-HTTPS origins).
- Toasts and notifications go through `@/utils/notify`, not Ant Design's `message` / `notification` directly.
- Dates, money, distances: the helpers in `@/utils/format/number`, `@/utils/format/dateTime` and `@/utils/geo/geoFormat` (they show Minsk time whatever the browser timezone) — never `toLocaleString()`. Coordinates from the API are GeoJSON `[lng, lat]`: convert with `toLatLng` / `toGeoJsonPoint` from `@/utils/geo/coordinates`; maps use `components/common/MapView.vue`.
- Every view state has one `h1`, loading and error states included; `a-result` renders its `title` as a `div`, so put the `h1` in its `#title` slot.

## 5. Forms: VeeValidate + Zod 3

Use the VeeValidate **components** (`Form`, `Field`) — `useForm` / `useField` are Composition API. Keep `zod@3`; wrap schemas with `toTypedSchema`. Tested pattern:

```vue
<script>
import { Form as VeeForm, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const schema = toTypedSchema(
  z.object({
    email: z.string({ required_error: 'Email is required' }).email('Enter a valid email'),
    password: z.string({ required_error: 'Password is required' }).min(8, 'At least 8 characters'),
  }),
)

// Presentational form: validates and emits `submit`; the parent dispatches the action and
// passes `loading` back while it runs.
export default {
  name: 'LoginForm',
  components: { VeeForm, VeeField },
  props: {
    loading: { type: Boolean, default: false },
  },
  emits: ['submit'],
  data() {
    return { schema }
  },
  methods: {
    onSubmit(values) {
      this.$emit('submit', values)
    },
  },
}
</script>

<template>
  <VeeForm v-slot="{ handleSubmit }" :validation-schema="schema" as="div">
    <a-form
      layout="vertical"
      class="rounded-card bg-card p-6 text-card-foreground"
      @submit="handleSubmit($event, onSubmit)"
    >
      <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="email">
        <a-form-item
          label="Email"
          :validate-status="errorMessage ? 'error' : ''"
          :help="errorMessage"
        >
          <a-input :value="value" @update:value="handleChange" @blur="handleBlur" />
        </a-form-item>
      </VeeField>
      <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="password">
        <a-form-item
          label="Password"
          :validate-status="errorMessage ? 'error' : ''"
          :help="errorMessage"
        >
          <a-input-password :value="value" @update:value="handleChange" @blur="handleBlur" />
        </a-form-item>
      </VeeField>
      <a-button type="primary" html-type="submit" :loading="loading">Sign in</a-button>
    </a-form>
  </VeeForm>
</template>
```

Why this shape:
- `VeeForm as="div"` + `<a-form>` gives Ant Design's layout while VeeValidate owns values and validation. Do **not** pass `:model` / `:rules` to `<a-form>` — that would run Ant Design's validator too.
- `handleSubmit($event, onSubmit)` (two arguments) — calling `handleSubmit(onSubmit)` in a template only creates a function and never submits.
- Bind inputs with `:value` + `@update:value="handleChange"` + `@blur="handleBlur"`; `v-bind="field"` does not match Ant Design's event names.
- `onSubmit` only runs when the schema passes; it receives the parsed values.
- A form that talks to the store itself (`components/auth/SignInForm.vue`) maps the action with `mapActions` and `isSubmitting` with `mapGetters`, and shows backend errors through the second argument of `onSubmit`: `async onSubmit(values, { setFieldError })` — a known message goes under its field (`setFieldError(field, message)`, via `mapAuthError` / `mapUserError` / `mapVehicleError` from `@/utils/formErrors`), anything else in a form-level `a-alert`.
- Mirror the backend rules (password 8+ chars and ≤ 72 bytes on sign up; `licenseNumber` 6–20 chars; names 2–50 chars).
- A rule across fields ("passwords match") in a Zod 3 `.refine` on the whole object runs only once every field has the right type, so it shows up last. Put it on a small object of just those fields and combine with `z.intersection(form, rule)` (see `signUpSchema` in `components/auth/SignUpForm.vue`).
- The schema always lives in the form component, at the top of `<script>` outside the component object — never in a separate file. Keep it compact: small local builders for repeated rules (`const filled = (label) => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`)`), one line per field where it fits. Export it by name (`export const loginSchema = z.object(…)`, then `const schema = toTypedSchema(loginSchema)`) so its rules can be unit-tested from the `.vue` file. A schema that depends on props (a trip's start) is a function: `export const completeTripSchema = (trip) => …`, wrapped in a computed (see `components/admin/CompleteTripModal.vue`).
- Rules two forms share are repeated in each, not imported; add a parity test like the one for `UserFormModal` ↔ `SignUpForm` in `tests/unit/components/auth/schemas.spec.js`. Mapping backend errors to fields is shared: add a mapper to `@/utils/formErrors`.
- Order checks as the backend does: a `.toUpperCase()` / `.trim()` that the backend applies first must come before the length checks (`'ß'` upper-cases to `'SS'`).

## 6. Test file

Place it in `frontend/tests/unit/`, mirroring the component's path under `src/`: `src/components/auth/LoginForm.vue` → `tests/unit/components/auth/LoginForm.spec.js` (a view: `tests/unit/views/CarListView.spec.js`). Import the component with `@/` (`import LoginForm from '@/components/auth/LoginForm.vue'`), never a relative path. `tests/unit/setup.js` already polyfills `matchMedia` / `ResizeObserver` for Ant Design in jsdom.

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '@/components/auth/LoginForm.vue'

describe('LoginForm', () => {
  let wrapper

  const mountComponent = () => {
    wrapper = mount(LoginForm, { attachTo: document.body })
    return wrapper
  }

  afterEach(() => wrapper?.unmount())

  it('shows validation errors and does not emit on invalid input', async () => {
    mountComponent()
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Email is required'))
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('emits submit with the form values when valid', async () => {
    mountComponent()
    await wrapper.find('input:not([type="password"])').setValue('a@b.co')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.emitted('submit')).toBeTruthy())
    expect(wrapper.emitted('submit')[0][0]).toEqual({ email: 'a@b.co', password: 'password123' })
  })
})
```

Testing notes:
- No need to install Ant Design in tests: Vitest uses `vite.config.js`, so `<a-*>` components and icons are auto-imported there too.
- VeeValidate validates asynchronously — use `vi.waitFor(...)`, not a single `flushPromises()`.
- Components using the store or router: pass `createStore({ modules: { … } })` / a `createRouter({ history: createMemoryHistory(), routes })` in `global.plugins`, and mock the `@/services/<resource>` wrappers with `vi.mock`. Lazy components registered under another name (`LazyFleetMap`) are mocked with `__esModule: true`; stub `MapView` (Leaflet) with `global.stubs`.
- `beforeEach` / `afterEach` callbacks must not **return** a function (`() => mock.mockReset()` returns the mock, and Vitest runs it as teardown). Use braces.

## 7. Finish

From `frontend/`:

```bash
npm run lint && npm run format:check && npm test && npm run build
```

For a UI change, also run `npm run test:e2e` (layout + accessibility at 375 / 1024 / 1440 px, journeys) when the Docker stack is up and seeded (CLAUDE.md gotcha 22). A new routed page belongs in the layout run: add it to `tests/e2e/layout.spec.js`.
