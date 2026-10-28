<script>
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import UserMenu from '@/components/layout/UserMenu.vue'

/**
 * Admin console chrome: sidebar (a drawer below `lg`), top bar, content.
 * Slots: default (content), `sidebar` (navigation and widgets), `topbar` (search).
 */
export default {
  name: 'AdminLayout',
  components: { BrandWordmark, UserMenu },
  data() {
    return {
      isDrawerOpen: false,
    }
  },
}
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <aside
      class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 bg-card px-4 py-6 text-card-foreground shadow-card lg:flex"
      aria-label="Admin"
    >
      <BrandWordmark :to="{ name: 'admin' }" size="sm" admin class="px-2" />
      <div class="flex-1 overflow-y-auto">
        <slot name="sidebar" />
      </div>
    </aside>

    <a-drawer v-model:open="isDrawerOpen" placement="left" :width="280" :closable="false">
      <div class="flex h-full flex-col gap-6" @click="isDrawerOpen = false">
        <BrandWordmark :to="{ name: 'admin' }" size="sm" admin />
        <slot name="sidebar" />
      </div>
    </a-drawer>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-40 flex h-16 items-center gap-3 bg-background/85 px-4 shadow-card backdrop-blur-md md:px-8"
      >
        <a-button
          type="text"
          shape="circle"
          class="lg:hidden"
          aria-label="Open admin navigation"
          @click="isDrawerOpen = true"
        >
          <template #icon><MenuOutlined /></template>
        </a-button>
        <div class="min-w-0 flex-1">
          <slot name="topbar" />
        </div>
        <a-button type="text" aria-label="Back to app" @click="$router.push({ name: 'fleet' })">
          <template #icon><ArrowLeftOutlined /></template>
          <span class="hidden sm:inline">Back to app</span>
        </a-button>
        <UserMenu />
      </header>

      <main id="main" class="min-w-0 flex-1 px-4 py-6 md:px-8" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>
