<script>
import { ALL } from '@/utils/fleetFilters'
import { CAR_STATUS_META } from '@/utils/derive'

// "Available only", status and minimum fuel. Shown inline from `md`
// and inside the mobile filter drawer (`vertical`).
export default {
  name: 'FleetFilterControls',
  props: {
    filters: { type: Object, required: true },
    // { free: 3, reserved: 1, … }
    statusCounts: { type: Object, default: () => ({}) },
    vertical: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  data() {
    return {
      all: ALL,
      // Follows the slider while dragging; the filter changes when it is released
      fuel: this.filters.minFuel,
      fuelMarks: { 0: '0 %', 50: '50 %', 100: '100 %' },
    }
  },
  computed: {
    statusOptions() {
      const total = Object.values(this.statusCounts).reduce((sum, count) => sum + count, 0)
      return [
        { value: ALL, label: `All statuses (${total})` },
        ...Object.entries(CAR_STATUS_META).map(([value, meta]) => ({
          value,
          label: `${meta.label} (${this.statusCounts[value] ?? 0})`,
        })),
      ]
    },
  },
  watch: {
    'filters.minFuel'(value) {
      this.fuel = value
    },
  },
  methods: {
    formatFuel(value) {
      return `${value} %`
    },
  },
}
</script>

<template>
  <div class="flex gap-x-6 gap-y-5" :class="vertical ? 'flex-col' : 'flex-wrap items-center'">
    <label class="flex items-center gap-2">
      <a-switch
        :checked="filters.availableOnly"
        :disabled="disabled"
        @change="$emit('change', { availableOnly: $event, status: all })"
      />
      <span class="text-label-lg">Available only</span>
    </label>

    <label v-if="!filters.availableOnly" class="flex flex-col gap-1 md:flex-row md:items-center">
      <span class="text-label-md text-muted-foreground">Status</span>
      <a-select
        :value="filters.status"
        :options="statusOptions"
        :disabled="disabled"
        class="min-w-48"
        aria-label="Car status"
        @change="$emit('change', { status: $event })"
      />
    </label>

    <div class="flex min-w-56 flex-col gap-1" :class="vertical ? '' : 'flex-1 md:max-w-72'">
      <span id="fleet-min-fuel" class="text-label-md text-muted-foreground">
        Minimum fuel: <span class="text-foreground">{{ formatFuel(fuel) }}</span>
      </span>
      <a-slider
        v-model:value="fuel"
        :min="0"
        :max="100"
        :step="5"
        :marks="vertical ? fuelMarks : undefined"
        :tip-formatter="formatFuel"
        :disabled="disabled"
        aria-labelled-by-for-handle="fleet-min-fuel"
        class="m-0 mx-1"
        @after-change="$emit('change', { minFuel: $event })"
      />
    </div>
  </div>
</template>
