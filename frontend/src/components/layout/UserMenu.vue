<script>
import { mapActions, mapGetters, mapState } from 'vuex'

import InitialsAvatar from '@/components/common/InitialsAvatar.vue'

export default {
  name: 'UserMenu',
  components: { InitialsAvatar },
  data() {
    return {
      isOpen: false,
    }
  },
  computed: {
    ...mapState('auth', ['user']),
    ...mapGetters('auth', ['fullName']),
  },
  methods: {
    ...mapActions('auth', ['logout']),
    async onSelect({ key }) {
      this.isOpen = false
      if (key === 'logout') {
        await this.logout()
        await this.$router.push({ name: 'auth' })
        return
      }
      this.$router.push({ name: key })
    },
  },
}
</script>

<template>
  <a-dropdown v-model:open="isOpen" :trigger="['click']" placement="bottomRight">
    <button
      type="button"
      class="flex items-center gap-2 rounded-full p-1 pr-2 text-foreground transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
    >
      <InitialsAvatar :user="user" />
      <!-- Visible (truncated) name from `sm`; screen readers always get the full name.
           `not-sr-only` would undo `truncate`, so the two are separate spans. -->
      <span class="hidden max-w-40 truncate text-label-lg sm:block" aria-hidden="true">
        {{ fullName }}
      </span>
      <span class="sr-only">{{ fullName }} (account menu)</span>
      <DownOutlined class="text-xs text-muted-foreground" aria-hidden="true" />
    </button>
    <template #overlay>
      <div
        class="min-w-60 overflow-hidden rounded-card bg-card text-card-foreground shadow-popover"
      >
        <div class="border-b border-border px-4 py-3">
          <p class="truncate text-label-lg">{{ fullName }}</p>
          <p class="truncate text-body-sm text-muted-foreground">{{ user?.email }}</p>
        </div>
        <a-menu class="border-none bg-transparent shadow-none" @click="onSelect">
          <a-menu-item key="my-trips">
            <template #icon><HistoryOutlined /></template>
            My Trips
          </a-menu-item>
          <a-menu-item key="my-profile">
            <template #icon><UserOutlined /></template>
            My Profile
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="logout" class="text-destructive">
            <template #icon><LogoutOutlined /></template>
            Log out
          </a-menu-item>
        </a-menu>
      </div>
    </template>
  </a-dropdown>
</template>
