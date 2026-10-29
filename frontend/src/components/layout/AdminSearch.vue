<script>
import { mapState } from 'vuex'

import { ADMIN_TABS, fullName, searchConsole } from '@/utils/admin'
import { carName } from '@/utils/format'

// Top-bar search over the loaded cars and users (client-side). Picking a result opens
// its section with `?car=` / `?user=`, which highlights the row.
export default {
  name: 'AdminSearch',
  data() {
    return { query: '' }
  },
  computed: {
    ...mapState('cars', { cars: 'items' }),
    ...mapState('admin/users', { users: 'items' }),
    options() {
      const results = searchConsole(this.query, { cars: this.cars, users: this.users })
      const groups = [
        {
          label: 'Cars',
          options: results.cars.map((car) => ({
            value: `car:${car._id}`,
            label: `${carName(car)} · ${car.registrationNumber}`,
          })),
        },
        {
          label: 'Users',
          options: results.users.map((user) => ({
            value: `user:${user._id}`,
            label: `${fullName(user)} · ${user.email}`,
          })),
        },
      ]
      return groups.filter((group) => group.options.length > 0)
    },
  },
  methods: {
    onSelect(value) {
      const [kind, id] = value.split(':')
      const query =
        kind === 'car' ? { tab: ADMIN_TABS.FLEET, car: id } : { tab: ADMIN_TABS.USERS, user: id }
      this.$router.push({ name: 'admin', query })
      this.query = ''
    },
  },
}
</script>

<template>
  <a-auto-complete
    v-model:value="query"
    :options="options"
    class="w-full max-w-md"
    :dropdown-match-select-width="360"
    @select="onSelect"
  >
    <a-input
      placeholder="Search cars, plates, VINs, users…"
      aria-label="Search cars and users"
      allow-clear
    >
      <template #prefix
        ><SearchOutlined class="text-muted-foreground" aria-hidden="true"
      /></template>
    </a-input>
  </a-auto-complete>
</template>
