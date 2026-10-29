<script>
import PillGroup from '@/components/common/PillGroup.vue'
import { ALL, countActiveFilters } from '@/utils/fleetFilters'
import FleetFilterControls from './FleetFilterControls.vue'
import SortDropdown from './SortDropdown.vue'

// Brand pills + secondary filters + sort. Emits partial filter changes;
// the page writes them to the URL, which is the source of truth.
export default {
  name: 'FleetFilters',
  components: { FleetFilterControls, PillGroup, SortDropdown },
  props: {
    filters: { type: Object, required: true },
    // { Toyota: 3, … } — counted with every filter except the brand
    brandCounts: { type: Object, default: () => ({}) },
    statusCounts: { type: Object, default: () => ({}) },
    // Effective sort, after defaults
    sort: { type: String, required: true },
    distanceEnabled: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change', 'reset'],
  data() {
    return { isDrawerOpen: false }
  },
  computed: {
    brandOptions() {
      const total = Object.values(this.brandCounts).reduce((sum, count) => sum + count, 0)
      const options = [
        { value: ALL, label: 'All cars', count: total },
        ...Object.entries(this.brandCounts).map(([brand, count]) => ({
          value: brand,
          label: brand,
          count,
        })),
      ]
      // Keep a selected brand visible even when no car matches the other filters
      if (this.filters.brand !== ALL && !(this.filters.brand in this.brandCounts)) {
        options.push({ value: this.filters.brand, label: this.filters.brand, count: 0 })
      }
      return options
    },
    activeCount() {
      return countActiveFilters(this.filters)
    },
    canReset() {
      return this.activeCount > 0 || this.filters.brand !== ALL || Boolean(this.filters.q)
    },
  },
  methods: {
    change(partial) {
      this.$emit('change', partial)
    },
  },
}
</script>

<template>
  <section class="flex flex-col gap-4" aria-label="Filters">
    <PillGroup
      :model-value="filters.brand"
      :options="brandOptions"
      aria-label="Brand"
      @update:model-value="change({ brand: $event })"
    />

    <div
      class="flex flex-wrap items-center justify-between gap-4 rounded-card bg-card p-4 shadow-card"
    >
      <FleetFilterControls
        class="hidden md:flex"
        :filters="filters"
        :status-counts="statusCounts"
        :disabled="disabled"
        @change="change"
      />

      <a-badge :count="activeCount" class="md:hidden">
        <a-button @click="isDrawerOpen = true">
          <template #icon><FilterOutlined /></template>
          Filters
        </a-button>
      </a-badge>

      <div class="flex items-center gap-2">
        <SortDropdown
          :value="sort"
          :distance-enabled="distanceEnabled"
          @change="change({ sort: $event })"
        />
        <a-button v-if="canReset" type="text" class="hidden md:inline-flex" @click="$emit('reset')">
          <template #icon><ReloadOutlined /></template>
          Reset
        </a-button>
      </div>
    </div>

    <a-drawer v-model:open="isDrawerOpen" placement="bottom" title="Filters" height="auto">
      <FleetFilterControls
        vertical
        :filters="filters"
        :status-counts="statusCounts"
        :disabled="disabled"
        @change="change"
      />
      <template #footer>
        <div class="flex justify-between gap-2">
          <a-button :disabled="!canReset" @click="$emit('reset')">Reset</a-button>
          <a-button type="primary" @click="isDrawerOpen = false">Show cars</a-button>
        </div>
      </template>
    </a-drawer>
  </section>
</template>
