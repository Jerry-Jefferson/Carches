<script>
// One tile of the "Vehicle details" grid; the default slot goes under the value
export default {
  name: 'SpecCard',
  props: {
    label: { type: String, required: true },
    value: { type: String, default: '' },
    // An icon component, e.g. DashboardOutlined
    icon: { type: [Object, Function], default: null },
    valueClass: { type: String, default: '' },
  },
}
</script>

<template>
  <div class="flex flex-col gap-1 rounded-card bg-card p-4 text-card-foreground shadow-card">
    <dt class="flex items-center gap-1.5 text-label-sm text-muted-foreground uppercase">
      <component :is="icon" v-if="icon" class="text-link" aria-hidden="true" />
      {{ label }}
    </dt>
    <dd class="m-0 flex flex-col gap-2">
      <span class="text-headline-sm" :class="valueClass">{{ value }}</span>
      <slot />
    </dd>
  </div>
</template>
