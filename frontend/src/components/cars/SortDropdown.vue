<script>
import { SORTS, SORT_OPTIONS } from '@/utils/fleetFilters'

// Fleet sort order. "Distance to you" needs the user's location.
export default {
  name: 'SortDropdown',
  props: {
    // The effective sort (after defaults), e.g. 'distance'
    value: { type: String, required: true },
    distanceEnabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  computed: {
    options() {
      return SORT_OPTIONS.map((option) => ({
        ...option,
        disabled: option.value === SORTS.DISTANCE && !this.distanceEnabled,
        label:
          option.value === SORTS.DISTANCE && !this.distanceEnabled
            ? `${option.label} (needs location)`
            : option.label,
      }))
    },
  },
}
</script>

<template>
  <label class="flex items-center gap-2">
    <span class="text-label-md whitespace-nowrap text-muted-foreground">Sort by</span>
    <a-select
      :value="value"
      :options="options"
      class="min-w-44"
      aria-label="Sort cars"
      @change="$emit('change', $event)"
    />
  </label>
</template>
