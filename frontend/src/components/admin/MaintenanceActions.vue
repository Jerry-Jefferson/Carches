<script>
import { NodeIndexOutlined, ToolOutlined } from '@ant-design/icons-vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import StatusTag from '@/components/common/StatusTag.vue'
import { RELOCATE_BOOKINGS_OVER, SERVICE_MILEAGE_OVER, SERVICE_YEAR_BEFORE } from '@/utils/admin'
import { carName, formatCoords, formatKm, formatNumber } from '@/utils/format'
import { DEPOT_POINT, toGeoJsonPoint } from '@/utils/geo'
import notify from '@/utils/notify'

const SERVICE = 'service'
const RELOCATE = 'relocate'

// Bulk fleet actions (E16, E17) with a preview of the cars they will touch (Q11, Q12)
export default {
  name: 'MaintenanceActions',
  components: { StatusTag },
  data() {
    return {
      current: null,
      depot: formatCoords(toGeoJsonPoint(DEPOT_POINT)),
    }
  },
  computed: {
    ...mapState('admin/fleet', ['isMutating']),
    ...mapGetters('admin/fleet', ['previewServiceCandidates', 'previewRelocationCandidates']),
    actions() {
      return [
        {
          key: SERVICE,
          title: 'Send old or high-mileage cars to service',
          rule: `Every car made before ${SERVICE_YEAR_BEFORE} or with more than ${formatNumber(SERVICE_MILEAGE_OVER)} km — including cars in a trip.`,
          icon: ToolOutlined,
          cars: this.previewServiceCandidates,
        },
        {
          key: RELOCATE,
          title: 'Relocate frequently booked cars',
          rule: `Cars booked more than ${RELOCATE_BOOKINGS_OVER} times that are not in a trip or reserved are moved to the depot (${this.depot}).`,
          icon: NodeIndexOutlined,
          cars: this.previewRelocationCandidates,
        },
      ]
    },
    action() {
      return this.actions.find((item) => item.key === this.current) ?? null
    },
  },
  methods: {
    ...mapActions('admin/fleet', ['sendToService', 'relocateFrequent']),
    countLabel(count) {
      return `${count} ${count === 1 ? 'car' : 'cars'}`
    },
    async confirm() {
      const run = this.current === SERVICE ? this.sendToService : this.relocateFrequent
      try {
        const result = await run()
        notify.success(`${result?.modifiedCount ?? 0} cars updated`)
        this.current = null
      } catch (err) {
        notify.apiError(err, 'The action failed')
      }
    },
    carName,
    formatKm,
  },
}
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-card bg-card p-4 text-card-foreground shadow-card"
    aria-labelledby="maintenance-title"
  >
    <h2 id="maintenance-title" class="m-0 text-label-lg">Fleet maintenance actions</h2>
    <div
      v-for="item in actions"
      :key="item.key"
      class="flex flex-col gap-2 rounded-control bg-surface p-3"
    >
      <p class="m-0 flex items-center gap-2 text-label-md">
        <component :is="item.icon" class="text-secondary-hover" aria-hidden="true" />
        {{ item.title }}
      </p>
      <p class="m-0 text-body-sm text-muted-foreground">{{ item.rule }}</p>
      <div class="flex items-center justify-between gap-2">
        <span class="text-body-sm">Matches now: {{ countLabel(item.cars.length) }}</span>
        <a-button size="small" @click="current = item.key">Review & run</a-button>
      </div>
    </div>

    <a-modal
      :open="Boolean(action)"
      :title="action?.title"
      ok-text="Run now"
      :ok-button-props="{ danger: true, loading: isMutating }"
      :cancel-button-props="{ disabled: isMutating }"
      @ok="confirm"
      @cancel="current = null"
    >
      <template v-if="action">
        <p class="text-body-md">{{ action.rule }}</p>
        <p class="text-label-lg">
          {{ countLabel(action.cars.length) }} will be updated, based on the loaded data:
        </p>
        <ul class="m-0 flex max-h-64 list-none flex-col gap-2 overflow-y-auto p-0">
          <li
            v-for="car in action.cars"
            :key="car._id"
            class="flex items-center justify-between gap-2 rounded-control bg-surface px-3 py-2"
          >
            <span class="min-w-0 truncate text-body-sm">
              {{ carName(car, { withYear: true }) }} · {{ car.registrationNumber }} ·
              {{ formatKm(car.mileage) }}
            </span>
            <StatusTag :status="car.status" />
          </li>
        </ul>
      </template>
    </a-modal>
  </section>
</template>
