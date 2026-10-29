<script>
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import { SITE } from '@/constants/site'

// Auth screen card: accent bar, brand header and the tabs + form in the slot
export default {
  name: 'AuthCard',
  components: { BrandWordmark },
  data() {
    return { tagline: SITE.tagline }
  },
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-dialog bg-popover text-popover-foreground shadow-popover"
  >
    <div
      class="h-1.5 bg-linear-to-r from-primary via-secondary to-secondary-hover"
      aria-hidden="true"
    />
    <div class="p-6 md:p-10">
      <header class="mb-8 flex flex-col items-center gap-3 text-center">
        <BrandWordmark size="lg" premium />
        <p class="text-body-lg text-muted-foreground">{{ tagline }}</p>
      </header>
      <slot />
    </div>
  </div>
</template>
