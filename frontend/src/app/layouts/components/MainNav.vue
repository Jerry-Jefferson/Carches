<script>
import { mapGetters } from 'vuex'
import { ROUTE_NAMES } from '@/shared/constants/routes'

const ITEMS = [
  {
    label: 'Fleet',
    to: { name: ROUTE_NAMES.FLEET },
    activeOn: [ROUTE_NAMES.FLEET, ROUTE_NAMES.CAR_DETAILS],
  },
  { label: 'My Trips', to: { name: ROUTE_NAMES.MY_TRIPS }, activeOn: [ROUTE_NAMES.MY_TRIPS] },
  {
    label: 'Admin Panel',
    to: { name: ROUTE_NAMES.ADMIN },
    activeOn: [ROUTE_NAMES.ADMIN],
    adminOnly: true,
  },
]

export default {
  name: 'MainNav',
  props: {
    vertical: { type: Boolean, default: false },
  },
  emits: ['navigate'],
  computed: {
    ...mapGetters('auth', ['isAdmin']),
    items() {
      return ITEMS.filter((item) => !item.adminOnly || this.isAdmin)
    },
  },
  methods: {
    isActive(item) {
      return item.activeOn.includes(this.$route.name)
    },
  },
}
</script>

<template>
  <nav aria-label="Main">
    <ul class="m-0 flex list-none gap-1 p-0" :class="vertical ? 'flex-col' : 'items-center'">
      <li v-for="item in items" :key="item.label">
        <router-link
          :to="item.to"
          class="flex h-10 items-center rounded-full px-4 text-label-lg transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :class="
            isActive(item)
              ? 'bg-primary text-primary-foreground shadow-card'
              : 'text-foreground hover:bg-muted'
          "
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="$emit('navigate')"
        >
          {{ item.label }}
        </router-link>
      </li>
    </ul>
  </nav>
</template>
