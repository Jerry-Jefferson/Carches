<script>
import { mapActions, mapState } from 'vuex'

import CarPlaceholder from '@/components/common/CarPlaceholder.vue'
import EnergyBar from '@/components/common/EnergyBar.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import { carName, formatCoords, formatKm, formatRelative } from '@/utils/format'
import notify from '@/utils/notify'

// The backend would delete these too, but the open booking would point at a ghost car
const BUSY = [CAR_STATUS.IN_USE, CAR_STATUS.RESERVED]

const byText = (read) => (a, b) => read(a).localeCompare(read(b))
const byNumber = (read) => (a, b) => (read(a) ?? -Infinity) - (read(b) ?? -Infinity)

// Fleet table of the admin console (E9 rows; E13 delete). Edit and history open in the section.
export default {
  name: 'AdminFleetTable',
  components: { CarPlaceholder, EnergyBar, StatusTag },
  props: {
    cars: { type: Array, required: true },
    // Row to highlight, e.g. after picking a car in the top search
    highlightId: { type: String, default: null },
    loading: { type: Boolean, default: false },
  },
  emits: ['edit', 'history', 'show-on-map'],
  data() {
    return {
      pagination: {
        defaultPageSize: 10,
        pageSizeOptions: ['5', '10', '20', '50'],
        showSizeChanger: true,
        hideOnSinglePage: false,
      },
      scroll: { x: 1100 },
      columns: [
        { title: 'Vehicle', key: 'vehicle', width: 260, sorter: byText((car) => carName(car)) },
        { title: 'VIN', key: 'vin', width: 210 },
        {
          title: 'Status',
          key: 'status',
          width: 140,
          sorter: byText((car) => carStatusMeta(car.status).label),
        },
        {
          title: 'Fuel',
          key: 'fuel',
          width: 140,
          sorter: byNumber((car) => car.fuelLevel),
        },
        { title: 'Location', key: 'location', width: 190 },
        {
          title: 'Mileage',
          key: 'mileage',
          width: 120,
          align: 'right',
          sorter: byNumber((car) => car.mileage),
        },
        {
          title: 'Updated',
          key: 'updated',
          width: 140,
          sorter: byNumber((car) => new Date(car.updatedAt).getTime()),
        },
        { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
      ],
    }
  },
  computed: {
    ...mapState('admin/fleet', ['isMutating']),
  },
  methods: {
    ...mapActions('admin/fleet', ['deleteCar']),
    carName,
    formatCoords,
    formatKm,
    formatRelative,
    rowKey(car) {
      return car._id
    },
    rowClass(car) {
      return car._id === this.highlightId ? '[&>td]:bg-primary/25' : ''
    },
    isBusy(car) {
      return BUSY.includes(car.status)
    },
    busyReason(car) {
      return `${carStatusMeta(car.status).label} cars can't be removed. Complete or delete the booking first.`
    },
    async copyVin(vin) {
      try {
        await navigator.clipboard.writeText(vin)
        notify.success('VIN copied')
      } catch {
        notify.error('Could not copy the VIN')
      }
    },
    async remove(car) {
      try {
        await this.deleteCar(car)
        notify.success(`${carName(car)} removed from the fleet`)
      } catch (err) {
        notify.apiError(err, 'Could not remove the car')
      }
    },
  },
}
</script>

<template>
  <a-table
    :columns="columns"
    :data-source="cars"
    :row-key="rowKey"
    :row-class-name="rowClass"
    :pagination="pagination"
    :scroll="scroll"
    :loading="loading"
    size="middle"
  >
    <template #emptyText>
      <p class="m-0 py-6 text-body-md text-muted-foreground">No cars match these filters.</p>
    </template>
    <template #bodyCell="{ column, record }">
      <div v-if="column.key === 'vehicle'" class="flex items-center gap-3">
        <CarPlaceholder :car="record" size="thumb" />
        <div class="min-w-0">
          <p class="m-0 truncate text-label-lg">{{ carName(record) }}</p>
          <p class="m-0 text-body-sm text-muted-foreground">
            <span class="rounded-full bg-muted px-2 py-0.5 text-label-sm uppercase">
              {{ record.registrationNumber }}
            </span>
            <span v-if="record.productionInfo?.year"> • {{ record.productionInfo.year }}</span>
          </p>
        </div>
      </div>

      <span v-else-if="column.key === 'vin'" class="inline-flex items-center gap-1">
        <code class="font-mono text-body-sm">{{ record.vin }}</code>
        <a-button
          type="text"
          size="small"
          :aria-label="`Copy VIN ${record.vin}`"
          @click="copyVin(record.vin)"
        >
          <template #icon><CopyOutlined /></template>
        </a-button>
      </span>

      <StatusTag v-else-if="column.key === 'status'" :status="record.status" />

      <EnergyBar v-else-if="column.key === 'fuel'" :level="record.fuelLevel ?? 0" />

      <div v-else-if="column.key === 'location'" class="flex flex-col items-start">
        <span class="text-body-sm text-muted-foreground">{{ formatCoords(record.location) }}</span>
        <a-button type="link" size="small" class="h-auto p-0" @click="$emit('show-on-map', record)">
          <template #icon><EnvironmentOutlined /></template>
          Show on map
        </a-button>
      </div>

      <span v-else-if="column.key === 'mileage'">{{ formatKm(record.mileage) }}</span>

      <span v-else-if="column.key === 'updated'" class="text-body-sm text-muted-foreground">
        {{ formatRelative(record.updatedAt) }}
      </span>

      <div v-else-if="column.key === 'actions'" class="flex items-center gap-1">
        <a-tooltip title="Edit">
          <a-button
            type="text"
            :aria-label="`Edit ${carName(record)}`"
            @click="$emit('edit', record)"
          >
            <template #icon><EditOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="History">
          <a-button
            type="text"
            :aria-label="`Booking history of ${carName(record)}`"
            @click="$emit('history', record)"
          >
            <template #icon><HistoryOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip v-if="isBusy(record)" :title="busyReason(record)">
          <a-button
            type="text"
            danger
            disabled
            :aria-label="`Delete ${carName(record)} (not possible: ${busyReason(record)})`"
          >
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-popconfirm
          v-else
          :title="`Remove ${carName(record)} (${record.registrationNumber}) from the fleet?`"
          ok-text="Remove"
          ok-type="default"
          :ok-button-props="{ danger: true, loading: isMutating }"
          cancel-text="Cancel"
          @confirm="remove(record)"
        >
          <a-button type="text" danger :aria-label="`Delete ${carName(record)}`">
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </a-popconfirm>
      </div>
    </template>
  </a-table>
</template>
