<script>
import { mapActions, mapState } from 'vuex'

import { LOW_FUEL_THRESHOLD } from '@/utils/derive'
import { carName, formatCoords, formatPercent } from '@/utils/format'
import notify from '@/utils/notify'

// "Fleet alerts": cars in a trip with less than 25 % fuel (E14)
export default {
  name: 'LowFuelAlerts',
  emits: ['show-on-map'],
  data() {
    return { isRefreshing: false, threshold: LOW_FUEL_THRESHOLD }
  },
  computed: {
    ...mapState('admin/fleet', ['lowFuel', 'isLoadingWidgets']),
  },
  methods: {
    ...mapActions('admin/fleet', ['fetchLowFuel']),
    async refresh() {
      this.isRefreshing = true
      try {
        await this.fetchLowFuel()
      } catch (err) {
        notify.apiError(err, 'Could not load the fuel alerts')
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
          class="rounded-full px-2 text-label-sm"
          :class="lowFuel.length ? 'bg-destructive/15 text-destructive' : 'bg-muted'"
          :aria-label="`${lowFuel.length} alerts`"
        >
          {{ lowFuel.length }}
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

    <a-skeleton v-if="isLoadingWidgets && !lowFuel.length" active :paragraph="{ rows: 2 }" />
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
