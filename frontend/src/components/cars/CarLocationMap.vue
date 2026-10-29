<script>
import MapView from '@/components/common/MapView.vue'
import { carStatusMeta } from '@/utils/derive'
import { carName, formatCoords } from '@/utils/format'
import { directionsUrl, toLatLng } from '@/utils/geo'

// "Location & Access": the car on a map, its coordinates and a directions link
export default {
  name: 'CarLocationMap',
  components: { MapView },
  props: {
    car: { type: Object, required: true },
    userLocation: { type: Object, default: null },
  },
  computed: {
    point() {
      return toLatLng(this.car.location)
    },
    markers() {
      if (!this.point) return []
      return [
        {
          id: this.car._id,
          ...this.point,
          tone: carStatusMeta(this.car.status).tone,
          label: `${carName(this.car)}, ${this.car.registrationNumber}`,
        },
      ]
    },
    coords() {
      return formatCoords(this.car.location)
    },
    directions() {
      return this.point ? directionsUrl(this.point, this.userLocation) : ''
    },
  },
}
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="car-location-title">
    <h2 id="car-location-title" class="m-0 text-headline-sm">Location & Access</h2>
    <p v-if="!point" class="m-0 rounded-card bg-muted p-4 text-body-md text-muted-foreground">
      This car has no location yet.
    </p>
    <div v-else class="relative">
      <MapView
        class="h-72"
        :markers="markers"
        :user-location="userLocation"
        :aria-label="`Map with the location of ${car.registrationNumber}`"
      />
      <div
        class="absolute bottom-3 left-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-3 rounded-card bg-popover p-3 text-popover-foreground shadow-popover"
      >
        <span class="flex items-center gap-2 text-label-md">
          <EnvironmentOutlined class="text-secondary-hover" aria-hidden="true" />
          {{ coords }}
        </span>
        <a
          :href="directions"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-label-md text-secondary-hover hover:underline"
        >
          <SendOutlined aria-hidden="true" />
          Get directions
          <span class="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  </section>
</template>
