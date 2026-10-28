<script>
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import HeaderSearch from './HeaderSearch.vue'
import MainNav from './MainNav.vue'
import UserMenu from './UserMenu.vue'

// Fixed 80 px header. Search shows inline from `lg`, the nav from `xl`;
// below that both live in a drawer behind the menu button.
export default {
  name: 'AppHeader',
  components: { BrandWordmark, HeaderSearch, MainNav, UserMenu },
  data() {
    return {
      isDrawerOpen: false,
    }
  },
}
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 h-20 bg-background/85 shadow-card backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
  >
    <div class="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-4 md:px-8 xl:px-16">
      <BrandWordmark :to="{ name: 'fleet' }" size="sm" class="shrink-0" />

      <div class="hidden max-w-md flex-1 lg:block">
        <HeaderSearch />
      </div>
      <div class="flex-1 lg:hidden" />

      <MainNav class="hidden xl:block" />

      <UserMenu />

      <a-button
        type="text"
        shape="circle"
        class="xl:hidden"
        aria-label="Open navigation"
        @click="isDrawerOpen = true"
      >
        <template #icon><MenuOutlined /></template>
      </a-button>
    </div>

    <a-drawer v-model:open="isDrawerOpen" placement="right" title="Menu" :width="300">
      <div class="flex flex-col gap-6">
        <HeaderSearch class="lg:hidden" @search="isDrawerOpen = false" />
        <MainNav vertical @navigate="isDrawerOpen = false" />
      </div>
    </a-drawer>
  </header>
</template>
