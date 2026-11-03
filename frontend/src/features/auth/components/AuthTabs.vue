<script>
import { LoginOutlined, UserAddOutlined } from '@ant-design/icons-vue'

const TABS = [
  { value: 'signin', label: 'Sign In', icon: LoginOutlined },
  { value: 'signup', label: 'Register', icon: UserAddOutlined },
]

// "Sign In" / "Register" switch. Tab ids are `auth-tab-<value>`; the panel that follows
// should use `auth-panel` with aria-labelledby pointing at the active tab.
export default {
  name: 'AuthTabs',
  props: {
    mode: {
      type: String,
      required: true,
      validator: (value) => TABS.some((tab) => tab.value === value),
    },
  },
  emits: ['update:mode'],
  data() {
    return { tabs: TABS }
  },
  methods: {
    select(value) {
      if (value !== this.mode) this.$emit('update:mode', value)
    },
    // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern
    onKeydown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const index = TABS.findIndex((tab) => tab.value === this.mode)
      const next = {
        ArrowLeft: (index - 1 + TABS.length) % TABS.length,
        ArrowRight: (index + 1) % TABS.length,
        Home: 0,
        End: TABS.length - 1,
      }[event.key]
      this.select(TABS[next].value)
      this.$nextTick(() => this.$refs.tab?.[next]?.focus())
    },
  },
}
</script>

<template>
  <div
    class="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
    role="tablist"
    aria-label="Sign in or register"
    @keydown="onKeydown"
  >
    <button
      v-for="tab in tabs"
      :id="`auth-tab-${tab.value}`"
      ref="tab"
      :key="tab.value"
      type="button"
      role="tab"
      aria-controls="auth-panel"
      :aria-selected="tab.value === mode"
      :tabindex="tab.value === mode ? 0 : -1"
      class="flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-4 py-2.5 text-label-lg transition-colors ease-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      :class="
        tab.value === mode
          ? 'bg-primary text-primary-foreground shadow-card'
          : 'bg-transparent text-muted-foreground hover:text-foreground'
      "
      @click="select(tab.value)"
    >
      <component :is="tab.icon" aria-hidden="true" />
      {{ tab.label }}
    </button>
  </div>
</template>
