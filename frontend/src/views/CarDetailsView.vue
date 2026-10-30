<script>
import {
  CalendarOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  IdcardOutlined,
  AimOutlined,
} from '@ant-design/icons-vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import BookingConfirmedModal from '@/components/booking/BookingConfirmedModal.vue'
import BookingPanel from '@/components/booking/BookingPanel.vue'
import MobileBookingBar from '@/components/booking/MobileBookingBar.vue'
import CarDetailsHeader from '@/components/cars/CarDetailsHeader.vue'
import CarLocationMap from '@/components/cars/CarLocationMap.vue'
import SpecCard from '@/components/cars/SpecCard.vue'
import CarPlaceholder from '@/components/common/CarPlaceholder.vue'
import EnergyBar from '@/components/common/EnergyBar.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { SITE } from '@/constants/site'
import { CAR_STATUS, carStatusMeta, fuelTone } from '@/utils/derive'
import { filtersToQuery } from '@/utils/fleetFilters'
import { carName, formatCoords, formatDistance, formatKm, formatPercent } from '@/utils/format'
import { mapUrl, toLatLng, walkingMinutes } from '@/utils/geo'
import { toneClasses } from '@/theme/tones'
import notify from '@/utils/notify'

export const POLL_MS = 30000

/**
 * Car details and booking (E10, E18, E21). While the car is not free, it is re-read
 * every 30 s (only when the tab is visible) so the booking button re-enables itself.
 */
export default {
  name: 'CarDetailsView',
  components: {
    BookingConfirmedModal,
    BookingPanel,
    CarDetailsHeader,
    CarLocationMap,
    CarPlaceholder,
    EnergyBar,
    ErrorState,
    MobileBookingBar,
    SpecCard,
    StatusTag,
  },
  props: {
    id: { type: String, required: true },
  },
  data() {
    return {
      confirmed: null,
      isConfirmedOpen: false,
    }
  },
  computed: {
    ...mapState('carDetails', ['car', 'isLoading', 'error', 'notFound']),
    ...mapState('cars', { fleetFilters: 'filters' }),
    ...mapState('geo', { userLocation: 'coords' }),
    ...mapGetters('carDetails', ['distance']),
    // The store may still hold another car while the new one loads
    shown() {
      return this.car?._id === this.id ? this.car : null
    },
    name() {
      return this.shown ? carName(this.shown) : 'Car details'
    },
    subtitle() {
      const year = this.shown?.productionInfo?.year
      return [year, this.shown?.registrationNumber].filter(Boolean).join(' · ')
    },
    isFree() {
      return this.shown?.status === CAR_STATUS.FREE
    },
    fleetRoute() {
      return { name: 'fleet', query: filtersToQuery(this.fleetFilters) }
    },
    hasPoint() {
      return Boolean(toLatLng(this.shown?.location))
    },
    coords() {
      return formatCoords(this.shown?.location)
    },
    mapLink() {
      const point = toLatLng(this.shown?.location)
      return point ? mapUrl(point) : ''
    },
    distanceText() {
      if (this.distance === null) return ''
      return `≈ ${formatDistance(this.distance)} • ${walkingMinutes(this.distance)} min walk`
    },
    specs() {
      const car = this.shown
      const status = carStatusMeta(car.status)
      return [
        {
          key: 'fuel',
          label: 'Fuel level',
          icon: DashboardOutlined,
          value: formatPercent(car.fuelLevel),
          valueClass: toneClasses(fuelTone(car.fuelLevel ?? 0)).text,
        },
        { key: 'mileage', label: 'Mileage', icon: FieldTimeOutlined, value: formatKm(car.mileage) },
        {
          key: 'year',
          label: 'Production year',
          icon: CalendarOutlined,
          value: String(car.productionInfo?.year ?? '—'),
        },
        {
          key: 'status',
          label: 'Status',
          icon: status.icon,
          value: status.label,
          valueClass: toneClasses(status.tone).text,
        },
        {
          key: 'plate',
          label: 'Registration number',
          icon: IdcardOutlined,
          value: car.registrationNumber ?? '—',
        },
        {
          key: 'distance',
          label: 'Distance from you',
          icon: AimOutlined,
          value: this.distance === null ? 'Location unavailable' : formatDistance(this.distance),
          valueClass: this.distance === null ? 'text-muted-foreground' : '',
        },
      ]
    },
  },
  watch: {
    id: {
      handler() {
        this.load()
      },
      immediate: true,
    },
    name: {
      handler(name) {
        if (this.shown) document.title = `${name} — ${SITE.name}`
      },
    },
  },
  created() {
    this.initGeo()
    this.loadBookings()
  },
  mounted() {
    this.pollTimer = setInterval(() => this.poll(), POLL_MS)
  },
  beforeUnmount() {
    clearInterval(this.pollTimer)
  },
  methods: {
    ...mapActions('carDetails', ['fetchCar']),
    ...mapActions('bookings', ['fetchMine']),
    ...mapActions('geo', { initGeo: 'init' }),
    async load() {
      try {
        await this.fetchCar({ id: this.id })
      } catch {
        // shown by the not-found / error states
      }
    },
    async loadBookings() {
      try {
        await this.fetchMine()
      } catch (err) {
        notify.apiError(err, 'Could not check your bookings')
      }
    },
    poll() {
      if (document.visibilityState !== 'visible') return
      if (!this.shown || this.isFree) return
      this.fetchCar({ id: this.id, silent: true })
    },
    onBooked({ booking, scheduled }) {
      this.confirmed = { booking, scheduled, car: this.shown }
      this.isConfirmedOpen = true
      // The car is now In trip / Reserved
      this.fetchCar({ id: this.id, silent: true })
    },
    focusBooking() {
      this.$refs.panel?.focusConfirm()
    },
  },
}
</script>

<template>
  <div class="pb-24 lg:pb-0">
    <a-result
      v-if="notFound"
      status="404"
      title="This car is not in the fleet"
      sub-title="It may have been removed, or the link is wrong."
    >
      <template #extra>
        <a-button type="primary" @click="$router.push(fleetRoute)">Back to fleet</a-button>
      </template>
    </a-result>

    <ErrorState
      v-else-if="error && !shown"
      title="Could not load this car"
      :message="error"
      :retrying="isLoading"
      @retry="load"
    />

    <div v-else-if="!shown" class="flex flex-col gap-6" aria-busy="true" aria-label="Loading car">
      <a-skeleton active :title="{ width: '40%' }" :paragraph="{ rows: 1 }" />
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div class="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
          <div class="aspect-[16/10] w-full animate-pulse rounded-dialog bg-muted" />
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div v-for="index in 6" :key="index" class="h-24 animate-pulse rounded-card bg-muted" />
          </div>
        </div>
        <div class="h-96 animate-pulse rounded-dialog bg-muted lg:col-span-5 xl:col-span-4" />
      </div>
    </div>

    <div v-else class="flex flex-col gap-6">
      <CarDetailsHeader :name="name" :fleet-route="fleetRoute" />

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div class="flex min-w-0 flex-col gap-8 lg:col-span-7 xl:col-span-8">
          <header class="flex flex-col gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <StatusTag :status="shown.status" :pulse="isFree" />
              <span
                v-if="distanceText"
                class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-label-md"
              >
                <AimOutlined class="text-link" aria-hidden="true" />
                {{ distanceText }}
              </span>
            </div>
            <div>
              <h1 class="m-0 text-headline-lg">{{ name }}</h1>
              <p class="m-0 text-headline-sm text-link">{{ subtitle }}</p>
            </div>
            <p v-if="hasPoint" class="m-0 flex flex-wrap items-center gap-2 text-body-md">
              <EnvironmentOutlined class="text-link" aria-hidden="true" />
              <span class="text-muted-foreground">{{ coords }}</span>
              <a
                :href="mapLink"
                target="_blank"
                rel="noopener noreferrer"
                class="text-label-md text-link hover:underline"
              >
                Open in maps
                <span class="sr-only">(opens in a new tab)</span>
              </a>
            </p>
          </header>

          <CarPlaceholder :car="shown" size="hero" />

          <section class="flex flex-col gap-3" aria-labelledby="vehicle-details-title">
            <h2 id="vehicle-details-title" class="m-0 text-headline-sm">Vehicle details</h2>
            <dl class="m-0 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SpecCard
                v-for="spec in specs"
                :key="spec.key"
                :label="spec.label"
                :value="spec.value"
                :icon="spec.icon"
                :value-class="spec.valueClass"
              >
                <EnergyBar
                  v-if="spec.key === 'fuel'"
                  :level="shown.fuelLevel ?? 0"
                  :show-label="false"
                />
              </SpecCard>
            </dl>
          </section>

          <CarLocationMap :car="shown" :user-location="userLocation" />
        </div>

        <aside class="lg:col-span-5 xl:col-span-4">
          <div class="lg:sticky lg:top-28">
            <BookingPanel ref="panel" :car="shown" @booked="onBooked" @refresh="load" />
          </div>
        </aside>
      </div>

      <MobileBookingBar :car="shown" @book="focusBooking" />
    </div>

    <BookingConfirmedModal
      v-model:open="isConfirmedOpen"
      :car="confirmed?.car"
      :booking="confirmed?.booking"
      :scheduled="confirmed?.scheduled ?? false"
      @closed="focusBooking"
    />
  </div>
</template>
