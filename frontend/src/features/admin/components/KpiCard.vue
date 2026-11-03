<script>
// One KPI of the console: label, big value, details (default slot) and a visual (`visual` slot)
export default {
  name: 'KpiCard',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
    // An icon component, e.g. CarOutlined
    icon: { type: [Object, Function], default: null },
    isLoading: { type: Boolean, default: false },
  },
}
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-card bg-card p-5 text-card-foreground shadow-card"
    :aria-label="label"
    :aria-busy="isLoading"
  >
    <div class="flex items-center justify-between gap-2">
      <h2 class="m-0 text-label-sm text-muted-foreground uppercase">{{ label }}</h2>
      <span
        v-if="icon"
        class="flex size-9 items-center justify-center rounded-full bg-primary/40 text-lg text-link"
        aria-hidden="true"
      >
        <component :is="icon" />
      </span>
    </div>
    <a-skeleton v-if="isLoading" active :title="false" :paragraph="{ rows: 2 }" />
    <template v-else>
      <p class="m-0 text-display leading-none">{{ value }}</p>
      <div class="text-body-sm text-muted-foreground"><slot /></div>
      <div v-if="$slots.visual" class="mt-auto"><slot name="visual" /></div>
    </template>
  </section>
</template>
