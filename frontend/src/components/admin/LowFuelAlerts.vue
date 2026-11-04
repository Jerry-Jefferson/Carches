<script>
import { mapActions, mapGetters } from 'vuex'

import { LOW_FUEL_THRESHOLD } from '@/utils/derive'
import { carName, formatCoords, formatPercent } from '@/utils/format'

// "Fleet alerts": cars in a trip with less than 25 % fuel (E14). A failed load is shown
// as an error, never as "no alerts".
export default {
  name: 'LowFuelAlerts',
  emits: ['show-on-map'],
  data() {
    return { isRefreshing: false, threshold: LOW_FUEL_THRESHOLD }
  },
  computed: {
    ...mapGetters('admin/fleet', { lowFuel: 'lowFuel', error: 'lowFuelError' }),
    ...mapGetters('admin/fleet', ['isLoadingWidgets']),
  },
  methods: {
    ...mapActions('admin/fleet', ['fetchLowFuel']),
    async refresh() {
      this.isRefreshing = true
      try {
        await this.fetchLowFuel()
      } catch {
        // kept in `error` and shown in the widget
      } finally {
        this.isRefreshing = false
      }
    },
    title(car) {
      return `${carName(car)} (${car.registrationNumber}) — fuel ${formatPercent(car.fuelLevel)}`
    },
    formatCoords,
  },
}
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-card bg-card p-4 text-card-foreground shadow-card"
    aria-labelledby="low-fuel-title"
  >
    <div class="flex items-center justify-between gap-2">
      <h2 id="low-fuel-title" class="m-0 flex items-center gap-2 text-label-lg">
        Fleet alerts
        <span
          v-if="!error"
          class="rounded-full px-2 text-label-sm"
          :class="lowFuel.length ? 'bg-destructive/15 text-destructive' : 'bg-muted'"
        >
          {{ lowFuel.length }}<span class="sr-only"> alerts</span>
        </span>
      </h2>
      <a-button
        type="text"
        size="small"
        :loading="isRefreshing"
        aria-label="Refresh fuel alerts"
        @click="refresh"
      >
        <template #icon><ReloadOutlined /></template>
      </a-button>
    </div>
    <p class="m-0 text-body-sm text-muted-foreground">
      Cars in a trip with less than {{ threshold }} % fuel.
    </p>

    <a-alert
      v-if="error"
      type="error"
      show-icon
      message="Fuel alerts could not be loaded"
      :description="error"
    >
      <template #action>
        <a-button size="small" :loading="isRefreshing" @click="refresh">Retry</a-button>
      </template>
    </a-alert>
    <a-skeleton v-else-if="isLoadingWidgets && !lowFuel.length" active :paragraph="{ rows: 2 }" />
    <p v-else-if="!lowFuel.length" class="m-0 text-body-md text-success">
      <CheckCircleOutlined aria-hidden="true" /> No low-fuel cars in trips.
    </p>
    <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
      <li
        v-for="car in lowFuel"
        :key="car._id"
        class="flex items-start gap-2 rounded-control bg-destructive/10 p-2"
      >
        <WarningOutlined class="mt-1 text-destructive" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="m-0 text-label-md">{{ title(car) }}</p>
          <p class="m-0 text-body-sm text-muted-foreground">{{ formatCoords(car.location) }}</p>
        </div>
        <a-button type="link" size="small" @click="$emit('show-on-map', car)">
          Show on map
        </a-button>
      </li>
    </ul>
  </section>
</template>
