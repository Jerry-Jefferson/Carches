<script>
import {
  CalendarOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  IdcardOutlined,
  AimOutlined,
} from '@ant-design/icons-vue'
import { mapActions, mapGetters } from 'vuex'

import BookingConfirmedModal from '@/features/bookings/components/booking/BookingConfirmedModal.vue'
import BookingPanel from '@/features/bookings/components/booking/BookingPanel.vue'
import MobileBookingBar from '@/features/bookings/components/booking/MobileBookingBar.vue'
import CarDetailsHeader from '@/features/cars/components/CarDetailsHeader.vue'
import CarLocationMap from '@/features/cars/components/CarLocationMap.vue'
import SpecCard from '@/features/cars/components/SpecCard.vue'
import CarPlaceholder from '@/shared/components/CarPlaceholder.vue'
import EnergyBar from '@/shared/components/EnergyBar.vue'
import ErrorState from '@/shared/components/ErrorState.vue'
import StatusTag from '@/shared/components/StatusTag.vue'
import { SITE } from '@/shared/constants/site'
import { CAR_STATUS, carStatusMeta, fuelTone } from '@/shared/utils/derive'
import { filtersToQuery } from '@/features/cars/utils/fleetFilters'
import {
  carName,
  formatCoords,
  formatDistance,
  formatKm,
  formatPercent,
} from '@/shared/utils/format'
import { mapUrl, toLatLng, walkingMinutes } from '@/shared/utils/geo'
import { toneClasses } from '@/shared/theme/tones'
import notify from '@/shared/utils/notify'
import { ROUTE_NAMES } from '@/shared/constants/routes'

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
    ...mapGetters('carDetails', ['car', 'isLoading', 'error', 'notFound']),
    ...mapGetters('cars', { fleetFilters: 'filters' }),
    ...mapGetters('geo', { userLocation: 'coords' }),
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
      return { name: ROUTE_NAMES.FLEET, query: filtersToQuery(this.fleetFilters) }
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
    // Immediate: revisiting a car that is still in the store keeps the same name
    name: {
      handler(name) {
        if (this.shown) document.title = `${name} — ${SITE.name}`
      },
      immediate: true,
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
      // A refresh of a car already on screen: the error states replace only an empty page
      const isRefresh = Boolean(this.shown)
      try {
        await this.fetchCar({ id: this.id })
      } catch (err) {
        if (isRefresh && !this.notFound) notify.apiError(err, 'Could not refresh the car')
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
      sub-title="It may have been removed, or the link is wrong."
    >
      <template #title>
        <h1 class="m-0 text-headline-md">This car is not in the fleet</h1>
      </template>
      <template #extra>
        <a-button type="primary" @click="$router.push(fleetRoute)">Back to fleet</a-button>
      </template>
    </a-result>

    <div v-else-if="error && !shown" class="flex flex-col gap-4">
      <h1 class="m-0 text-headline-lg">Car details</h1>
      <ErrorState
        title="Could not load this car"
        :message="error"
        :retrying="isLoading"
        @retry="load"
      />
    </div>

    <div v-else-if="!shown" class="flex flex-col gap-6" aria-busy="true">
      <h1 class="sr-only">Loading car</h1>
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
