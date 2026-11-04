<script>
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

// Fleet, car details, trips, profile, not found
export default {
  name: 'AppLayout',
  components: { AppFooter, AppHeader },
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <a
      href="#main"
      class="sr-only z-[60] rounded-control bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Skip to content
    </a>
    <AppHeader />
    <main id="main" class="flex-1 pt-20" tabindex="-1">
      <div class="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8 xl:px-16">
        <slot />
      </div>
    </main>
    <AppFooter />
  </div>
</template>
