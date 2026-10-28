<script>
const SIZES = {
  sm: { text: 'text-headline-sm', badge: 'size-8 text-base' },
  md: { text: 'text-headline-md', badge: 'size-10 text-xl' },
  lg: { text: 'text-headline-lg', badge: 'size-14 text-3xl' },
}

// "Carshes" wordmark: "Car" in foreground, "shes" in the olive secondary
export default {
  name: 'BrandWordmark',
  props: {
    size: {
      type: String,
      default: 'md',
      validator: (value) => Object.keys(SIZES).includes(value),
    },
    premium: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
    // Route to link to; renders plain text when empty
    to: { type: [String, Object], default: null },
  },
  computed: {
    classes() {
      return SIZES[this.size]
    },
    tag() {
      return this.to ? 'router-link' : 'span'
    },
  },
}
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    class="inline-flex items-center gap-2.5 rounded-control text-foreground no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    :aria-label="to ? 'Carshes home' : undefined"
  >
    <span
      class="flex shrink-0 items-center justify-center rounded-full bg-primary/40 text-foreground"
      :class="classes.badge"
      aria-hidden="true"
    >
      <CarFilled />
    </span>
    <span class="font-bold tracking-tight" :class="classes.text">
      Car<span class="text-secondary-hover">shes</span>
      <span v-if="admin" class="font-semibold text-muted-foreground"> Admin</span>
    </span>
    <span
      v-if="premium"
      class="rounded-full bg-accent px-2 py-0.5 text-label-sm text-accent-foreground uppercase"
    >
      Premium
    </span>
  </component>
</template>
