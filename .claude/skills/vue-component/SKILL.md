---
name: vue-component
description: Step-by-step recipe for creating a new Vue component in the Carshes frontend - Options API skeleton, design-system color tokens, Ant Design Vue usage, VeeValidate + Zod form pattern, and a Vitest test file. Use whenever adding or rewriting a .vue file in frontend/src.
---

# Creating a Vue component (Carshes frontend)

Work inside `frontend/`. Read `CLAUDE.md` §8.2–8.3 if anything below is unclear.

## 1. Pick the location and name

| Kind | Folder | Example |
|------|--------|---------|
| Routed page | `src/views/` | `CarListView.vue` |
| Reusable piece | `src/components/` (group by feature in subfolders when it grows) | `CarCard.vue`, `auth/LoginForm.vue` |

- PascalCase, **multi-word** names (`vue/multi-word-component-names` is an error).
- A new view also needs a lazy route in `src/router/index.js`:
  `{ path: '/cars', name: 'cars', component: () => import('@/views/CarListView.vue') }` — add it **before** the catch-all `/:pathMatch(.*)*`.

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
- Store, router, HTTP: `mapState` / `mapGetters` / `mapActions` (see the `vuex-module` skill), `this.$router`, `this.$route`. Never call `axios` directly — go through a Vuex action that uses `@/api/http`.
- Comments and UI text in English.

## 3. Styling with the design system

- Colors **only** from tokens: `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-popover`, `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground`, `bg-secondary`, `hover:bg-secondary-hover`, `text-secondary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `text-accent-foreground`, `bg-surface`, `border-border`, `border-input`, `ring-ring`; status colours `destructive`, `success`, `warning`, `info` (+ `-foreground`, soft backgrounds via `bg-success/15`). Status labels/tones come from `@/utils/derive` (`carStatusMeta`, `bookingStatusMeta`, `fuelTone`); display values from `@/utils/format`.
- Typography and shape from the theme: `text-headline-sm`, `text-body-md`, `text-label-sm uppercase`, …; `rounded-control` / `rounded-card` / `rounded-dialog`; `shadow-card` / `shadow-popover`.
- Never `text-gray-500`, `bg-blue-600`, hex or `rgb()` values. Opacity works: `bg-primary/50`.
- Dark mode: tokens switch automatically with `.dark` on `<html>`; use `dark:` only for layout differences, not colors.
- Tailwind for layout/spacing (`flex`, `gap-4`, `p-6`, `grid`), Ant Design for controls.
- Utilities are `!important` and Preflight is off — don't add `!` prefixes or global resets.
- Need a new color? Add the token in `src/styles/design-system.css` (`:root` **and** `.dark`), map it in `@theme inline` in `src/styles/main.css`, and in `TOKEN_MAP` in `src/theme/antd.js` if Ant Design should use it.

## 4. Ant Design Vue

- Components are auto-imported (`unplugin-vue-components`): write `<a-button>`, `<a-table>`, `<a-modal>` with no import.
- Icons from `@ant-design/icons-vue` are auto-imported too (`resolveIcons: true`): write `<CarOutlined />` in the template with no import or `components` entry.
- Ant Design colors come from the design tokens via `ConfigProvider` in `App.vue` — don't pass `color` props or override `.ant-*` classes for color.
- `v-model` on Ant Design inputs is `v-model:value`, not `v-model`.

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

export default {
  name: 'LoginForm',
  components: { VeeForm, VeeField },
  emits: ['submit'],
  data() {
    return { schema, isSubmitting: false }
  },
  methods: {
    async onSubmit(values) {
      this.isSubmitting = true
      try {
        this.$emit('submit', values)
      } finally {
        this.isSubmitting = false
      }
    },
  },
}
</script>

<template>
  <VeeForm v-slot="{ handleSubmit }" :validation-schema="schema" as="div">
    <a-form
      layout="vertical"
      class="rounded-lg bg-card p-6 text-card-foreground"
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
      <a-button type="primary" html-type="submit" :loading="isSubmitting">Sign in</a-button>
    </a-form>
  </VeeForm>
</template>
```

Why this shape:
- `VeeForm as="div"` + `<a-form>` gives Ant Design's layout while VeeValidate owns values and validation. Do **not** pass `:model` / `:rules` to `<a-form>` — that would run Ant Design's validator too.
- `handleSubmit($event, onSubmit)` (two arguments) — calling `handleSubmit(onSubmit)` in a template only creates a function and never submits.
- Bind inputs with `:value` + `@update:value="handleChange"` + `@blur="handleBlur"`; `v-bind="field"` does not match Ant Design's event names.
- `onSubmit` only runs when the schema passes; it receives the parsed values.
- Mirror the backend rules (password 8+ chars and ≤ 72 bytes on sign up; `licenseNumber` 6–20 chars; names 2–50 chars).

## 6. Test file

Place next to the code in a `__tests__` folder: `src/components/__tests__/LoginForm.spec.js`. `src/test/setup.js` already polyfills `matchMedia` / `ResizeObserver` for Ant Design in jsdom.

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '../LoginForm.vue'

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
- Components using the store or router: pass `createStore({ modules: { … } })` / a `createRouter({ history: createMemoryHistory(), routes })` in `global.plugins`, and mock the API modules the store calls (`vi.mock('@/api/auth', …)`) — see `components/layout/__tests__/layout.spec.js`.
- `beforeEach` / `afterEach` callbacks must not **return** a function (`() => mock.mockReset()` returns the mock, and Vitest runs it as teardown). Use braces.

## 7. Finish

From `frontend/`:

```bash
npm run lint && npm run format:check && npm test && npm run build
```
