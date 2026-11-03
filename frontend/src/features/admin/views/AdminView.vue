<script>
import {
  CarOutlined,
  ScheduleOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import { mapActions, mapGetters } from 'vuex'

import AdminFleetSection from '@/features/admin/components/AdminFleetSection.vue'
import AdminSparkline from '@/features/admin/components/AdminSparkline.vue'
import AdminTripsSection from '@/features/admin/components/AdminTripsSection.vue'
import AdminUsersSection from '@/features/admin/components/AdminUsersSection.vue'
import KpiCard from '@/features/admin/components/KpiCard.vue'
import StackedBar from '@/features/admin/components/StackedBar.vue'
import PillGroup from '@/shared/components/PillGroup.vue'
import { ADMIN_TABS, filterTrips } from '@/features/admin/utils/admin'
import {
  FLEET_COLUMNS,
  csvFilename,
  tripColumns,
  userColumns,
} from '@/features/admin/utils/adminExport'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import { CAR_STATUS, CAR_STATUS_META } from '@/shared/utils/derive'
import { formatDate, formatKm, formatNumber } from '@/shared/utils/format'
import notify from '@/shared/utils/notify'
import { ROUTE_NAMES } from '@/shared/constants/routes'

export const REFRESH_MS = 60000

// ?date= holds a Minsk dayKey ("2026-10-29")
const isDayKey = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T12:00:00Z`))

/**
 * Fleet Dispatch & Control (E5–E23 except E1–E4, E18). Loads cars, users and bookings in
 * parallel, then the side widgets; everything else is computed client-side (Q13).
 * Reloads every 60 s while the tab is visible. Sections are deep-linked with ?tab=,
 * ?car= / ?trip= / ?user= point at a row (search results, history links), and ?date= is
 * the day for the trip statistics (left out for today, and put back after links that drop it).
 */
export default {
  name: 'AdminView',
  components: {
    AdminFleetSection,
    AdminSparkline,
    AdminTripsSection,
    AdminUsersSection,
    KpiCard,
    PillGroup,
    StackedBar,
  },
  data() {
    return {
      isRefreshing: false,
      loadError: null,
      icons: {
        fleet: CarOutlined,
        rentals: ThunderboltOutlined,
        trips: ScheduleOutlined,
        users: TeamOutlined,
      },
      exportItems: [
        { key: ADMIN_TABS.FLEET, label: 'Fleet' },
        { key: ADMIN_TABS.TRIPS, label: 'Trips & bookings' },
        { key: ADMIN_TABS.USERS, label: 'Users' },
      ],
    }
  },
  computed: {
    ...mapGetters('cars', { cars: 'items', carsLoadedAt: 'loadedAt' }),
    ...mapGetters('admin/trips', { trips: 'items', tripFilters: 'filters' }),
    ...mapGetters('admin/users', { users: 'items' }),
    ...mapGetters('admin/insights', ['date', 'now']),
    ...mapGetters('admin/insights', ['kpis', 'sparkline', 'isToday']),
    ...mapGetters('admin/fleet', ['filteredCars']),
    ...mapGetters('admin/users', ['filteredUsers', 'tripCounts']),
    tab() {
      const tab = this.$route.query.tab
      return Object.values(ADMIN_TABS).includes(tab) ? tab : ADMIN_TABS.FLEET
    },
    tabOptions() {
      return [
        { value: ADMIN_TABS.FLEET, label: 'Vehicle fleet', count: this.cars.length },
        { value: ADMIN_TABS.TRIPS, label: 'Trips & bookings', count: this.trips.length },
        { value: ADMIN_TABS.USERS, label: 'Users', count: this.users.length },
      ]
    },
    isInitialLoad() {
      return !this.carsLoadedAt && this.isRefreshing
    },
    dateLabel() {
      return this.isToday ? 'today' : formatDate(`${this.date}T12:00:00+03:00`)
    },
    fleetSegments() {
      return Object.values(CAR_STATUS).map((status) => ({
        key: status,
        label: CAR_STATUS_META[status].label,
        tone: CAR_STATUS_META[status].tone,
        value: this.kpis.fleet.byStatus[status],
      }))
    },
    sparkPoints() {
      return this.sparkline.map(({ day, count }) => ({
        label: formatDate(`${day}T12:00:00+03:00`),
        value: count,
      }))
    },
    // Trips finished on the selected day vs the day before
    trend() {
      const { completed, previous } = this.kpis.day
      if (completed === previous) return null
      return completed > previous ? 'up' : 'down'
    },
    carsById() {
      return Object.fromEntries(this.cars.map((car) => [car._id, car]))
    },
  },
  watch: {
    '$route.query.date': {
      handler(value) {
        if (isDayKey(value)) {
          if (value !== this.date) this.setDate(value)
        } else {
          this.syncDateQuery()
        }
      },
      immediate: true,
    },
    date() {
      this.syncDateQuery()
    },
  },
  created() {
    this.refresh()
  },
  mounted() {
    this.timer = setInterval(() => this.onTick(), REFRESH_MS)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    ...mapActions('admin', ['loadAll']),
    ...mapActions('admin/insights', ['setDate', 'tick']),
    async refresh() {
      if (this.isRefreshing) return
      this.isRefreshing = true
      try {
        this.loadError = await this.loadAll()
      } finally {
        this.isRefreshing = false
      }
    },
    onTick() {
      // Durations tick every minute; the data reloads only while someone is looking
      this.tick()
      if (document.visibilityState === 'visible') this.refresh()
    },
    // The selected day → ?date= (none for today)
    syncDateQuery() {
      if (this.$route.name !== ROUTE_NAMES.ADMIN) return
      const date = this.isToday ? undefined : this.date
      if (this.$route.query.date === date) return
      this.$router.replace({ query: { ...this.$route.query, date } })
    },
    selectTab(tab) {
      this.$router.replace({
        name: ROUTE_NAMES.ADMIN,
        query: { tab, date: this.$route.query.date },
      })
    },
    async addVehicle() {
      if (this.tab !== ADMIN_TABS.FLEET) {
        await this.$router.replace({
          name: ROUTE_NAMES.ADMIN,
          query: { date: this.$route.query.date },
        })
      }
      await this.$nextTick()
      this.$refs.fleet?.openCreate()
    },
    exportReport({ key }) {
      const sections = {
        [ADMIN_TABS.FLEET]: () => [this.filteredCars, FLEET_COLUMNS],
        [ADMIN_TABS.USERS]: () => [this.filteredUsers, userColumns(this.tripCounts)],
        [ADMIN_TABS.TRIPS]: () => {
          const options = { carsById: this.carsById, day: this.date, now: this.now }
          return [filterTrips(this.trips, this.tripFilters, options), tripColumns(options)]
        },
      }
      const [rows, columns] = sections[key]()
      if (rows.length === 0) {
        notify.info('Nothing to export: the list is empty')
        return
      }
      downloadCsv(csvFilename(key, this.date), toCsv(rows, columns))
    },
    formatKm,
    formatNumber,
  },
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <a-breadcrumb>
          <a-breadcrumb-item>Control centre</a-breadcrumb-item>
          <a-breadcrumb-item>Operations overview</a-breadcrumb-item>
        </a-breadcrumb>
        <h1 class="m-0 mt-1 text-headline-lg">Fleet Dispatch &amp; Control</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a-date-picker
          :value="date"
          value-format="YYYY-MM-DD"
          format="D MMM YYYY"
          :allow-clear="false"
          aria-label="Day for trip statistics"
          @update:value="setDate"
        />
        <a-button :loading="isRefreshing" @click="refresh">
          <template #icon><ReloadOutlined /></template>
          Refresh
        </a-button>
        <a-dropdown :trigger="['click']">
          <a-button>
            <template #icon><DownloadOutlined /></template>
            Export report
          </a-button>
          <template #overlay>
            <a-menu @click="exportReport">
              <a-menu-item v-for="item in exportItems" :key="item.key">
                {{ item.label }} (CSV)
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-button type="primary" @click="addVehicle">
          <template #icon><PlusCircleOutlined /></template>
          Add vehicle
        </a-button>
      </div>
    </header>

    <a-alert
      v-if="loadError"
      type="error"
      show-icon
      message="Some console data could not be loaded"
      :description="loadError"
    >
      <template #action>
        <a-button size="small" :loading="isRefreshing" @click="refresh">Retry</a-button>
      </template>
    </a-alert>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total vehicles"
        :value="formatNumber(kpis.fleet.total)"
        :icon="icons.fleet"
        :is-loading="isInitialLoad"
      >
        <span class="text-success">●</span> Available {{ kpis.fleet.byStatus.free }} ·
        <span class="text-destructive">●</span> In service {{ kpis.fleet.byStatus.in_service }}
        <template #visual>
          <StackedBar :segments="fleetSegments" label="Cars by status" />
        </template>
      </KpiCard>

      <KpiCard
        label="Active rentals"
        :value="formatNumber(kpis.rentals.active)"
        :icon="icons.rentals"
        :is-loading="isInitialLoad"
      >
        Utilisation {{ kpis.rentals.utilisation }} %
        <template #visual>
          <AdminSparkline :points="sparkPoints" label="Trips started per day, last 7 days" />
        </template>
      </KpiCard>

      <KpiCard
        :label="`Trips completed ${dateLabel}`"
        :value="formatNumber(kpis.day.completed)"
        :icon="icons.trips"
        :is-loading="isInitialLoad"
      >
        <span v-if="trend === 'up'" class="text-success">
          <RiseOutlined aria-hidden="true" /> more than the day before ·
        </span>
        <span v-else-if="trend === 'down'" class="text-destructive">
          <FallOutlined aria-hidden="true" /> fewer than the day before ·
        </span>
        {{ formatKm(kpis.day.distance) }} driven · {{ kpis.day.upcoming }} upcoming reservations
      </KpiCard>

      <KpiCard
        label="Users"
        :value="formatNumber(kpis.users.total)"
        :icon="icons.users"
        :is-loading="isInitialLoad"
      >
        {{ kpis.users.newThisWeek }} new in the last 7 days · {{ kpis.users.admins }} admins
      </KpiCard>
    </div>

    <PillGroup
      :model-value="tab"
      :options="tabOptions"
      aria-label="Console sections"
      @update:model-value="selectTab"
    />

    <AdminFleetSection v-if="tab === 'fleet'" ref="fleet" :focus-id="$route.query.car ?? null" />
    <AdminTripsSection
      v-else-if="tab === 'trips'"
      ref="trips"
      :focus-id="$route.query.trip ?? null"
    />
    <AdminUsersSection v-else ref="users" :focus-id="$route.query.user ?? null" />
  </div>
</template>
