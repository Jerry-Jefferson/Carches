<script>
import { SITE } from '@/constants/site'
import { formatDistance } from '@/utils/format'
import { walkingMinutes } from '@/utils/geo'

// Fleet page header: location chip, available count, title, quick metrics, map toggle
export default {
  name: 'FleetHeader',
  props: {
    freeCount: { type: Number, default: 0 },
    // { car, distance } or null
    nearest: { type: Object, default: null },
    // geo store status: idle | asking | granted | denied | unsupported
    geoStatus: { type: String, default: 'idle' },
    isMapOpen: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
  },
  emits: ['locate', 'toggle-map'],
  data() {
    return { city: SITE.city }
  },
  computed: {
    hasLocation() {
      return this.geoStatus === 'granted'
    },
    canAskLocation() {
      return this.geoStatus === 'idle' || this.geoStatus === 'asking'
    },
    countLabel() {
      if (this.isLoading) return 'Loading cars…'
      return `${this.freeCount} available ${this.freeCount === 1 ? 'car' : 'cars'}`
    },
    locationLabel() {
      return this.hasLocation ? 'Your location' : 'City centre'
    },
    nearestDistance() {
      if (!this.nearest) return ''
      return `${formatDistance(this.nearest.distance)} • ≈ ${walkingMinutes(this.nearest.distance)} min`
    },
    nearestRoute() {
      return this.nearest ? { name: 'car-details', params: { id: this.nearest.car._id } } : null
    },
    locationNote() {
      if (this.geoStatus === 'unsupported') return 'Location is not supported by this browser'
      if (this.geoStatus === 'denied') return 'Location unavailable'
      return 'No free cars nearby'
    },
  },
}
</script>

<template>
  <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
    <div class="min-w-0">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-label-md text-muted-foreground"
        >
          <span class="size-2 rounded-full bg-success" aria-hidden="true" />
          {{ city }} • {{ locationLabel }}
        </span>
        <span class="text-label-sm text-secondary-hover uppercase">
          {{ countLabel }}
        </span>
      </div>
      <h1 class="m-0 text-headline-lg">Carshes Fleet</h1>
      <p class="m-0 mt-2 max-w-2xl text-body-lg text-muted-foreground">
        Pick a car near you in {{ city }}, check its fuel level and start your trip with instant
        one-click rental.
      </p>
    </div>

    <div class="flex flex-wrap items-stretch gap-3">
      <div class="min-w-44 rounded-card bg-card px-4 py-3 shadow-card">
        <p class="m-0 flex items-center gap-1.5 text-label-sm text-muted-foreground uppercase">
          <AimOutlined aria-hidden="true" /> Nearest car
        </p>
        <router-link
          v-if="nearest"
          :to="nearestRoute"
          class="text-label-lg text-card-foreground hover:text-secondary-hover"
        >
          {{ nearestDistance }}
        </router-link>
        <a-button
          v-else-if="canAskLocation"
          type="link"
          class="h-auto p-0 text-label-lg"
          :loading="geoStatus === 'asking'"
          @click="$emit('locate')"
        >
          Use my location
        </a-button>
        <p v-else class="m-0 text-label-lg text-muted-foreground">{{ locationNote }}</p>
      </div>

      <div class="min-w-36 rounded-card bg-card px-4 py-3 shadow-card">
        <p class="m-0 flex items-center gap-1.5 text-label-sm text-muted-foreground uppercase">
          <CheckCircleOutlined aria-hidden="true" /> Available now
        </p>
        <p class="m-0 text-label-lg">{{ freeCount }}</p>
      </div>

      <a-button
        size="large"
        class="h-auto self-stretch"
        :type="isMapOpen ? 'primary' : 'default'"
        :aria-pressed="isMapOpen"
        aria-controls="fleet-map"
        @click="$emit('toggle-map')"
      >
        <template #icon><CompassOutlined /></template>
        Map View
      </a-button>
    </div>
  </header>
</template>
