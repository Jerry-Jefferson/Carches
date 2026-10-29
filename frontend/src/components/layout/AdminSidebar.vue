<script>
import {
  CarOutlined,
  DashboardOutlined,
  ScheduleOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { mapGetters, mapState } from 'vuex'

import { ADMIN_TABS } from '@/utils/admin'

// Admin navigation: sections of the console (?tab=) and the fleet status widget
export default {
  name: 'AdminSidebar',
  data() {
    return {
      items: [
        { key: 'overview', label: 'Control console', icon: DashboardOutlined, tab: null },
        { key: 'fleet', label: 'Car fleet', icon: CarOutlined, tab: ADMIN_TABS.FLEET },
        {
          key: 'trips',
          label: 'Bookings & requests',
          icon: ScheduleOutlined,
          tab: ADMIN_TABS.TRIPS,
        },
        { key: 'users', label: 'Users', icon: TeamOutlined, tab: ADMIN_TABS.USERS },
      ],
    }
  },
  computed: {
    ...mapState('cars', { cars: 'items' }),
    ...mapGetters('cars', ['freeCount']),
    activeTab() {
      return this.$route.query.tab ?? null
    },
    share() {
      return this.cars.length ? Math.round((this.freeCount / this.cars.length) * 100) : 0
    },
  },
  methods: {
    routeOf(item) {
      return { name: 'admin', query: item.tab ? { tab: item.tab } : {} }
    },
    isActive(item) {
      return item.tab === this.activeTab
    },
    onClick(item) {
      if (!item.tab) window.scrollTo?.({ top: 0, behavior: 'smooth' })
    },
  },
}
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <nav aria-label="Admin sections">
      <ul class="m-0 flex list-none flex-col gap-1 p-0">
        <li v-for="item in items" :key="item.key">
          <router-link
            :to="routeOf(item)"
            class="flex items-center gap-3 rounded-control px-3 py-2.5 text-label-lg transition-colors duration-200"
            :class="
              isActive(item)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            "
            :aria-current="isActive(item) ? 'page' : undefined"
            @click="onClick(item)"
          >
            <component :is="item.icon" aria-hidden="true" />
            {{ item.label }}
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="mt-auto rounded-card bg-muted p-4">
      <p class="m-0 text-label-sm text-muted-foreground uppercase">Fleet status</p>
      <p class="m-0 mt-1 text-label-lg">{{ freeCount }} of {{ cars.length }} cars available</p>
      <div
        class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-label="Available cars"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="share"
      >
        <div class="h-full rounded-full bg-success" :style="{ width: `${share}%` }" />
      </div>
    </div>
  </div>
</template>
