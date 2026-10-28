<script>
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import { FOOTER_LINKS, SITE } from '@/config/site'

export default {
  name: 'AppFooter',
  components: { BrandWordmark },
  data() {
    return {
      site: SITE,
      links: FOOTER_LINKS,
      year: new Date().getFullYear(),
    }
  },
}
</script>

<template>
  <footer class="mt-16 bg-muted text-muted-foreground">
    <div class="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 md:grid-cols-3 md:px-8 xl:px-16">
      <div class="flex flex-col gap-3">
        <BrandWordmark size="sm" />
        <p class="max-w-xs text-body-md">{{ site.tagline }}</p>
      </div>

      <nav aria-label="Footer">
        <h2 class="mb-3 text-label-sm text-foreground uppercase">Navigation</h2>
        <ul class="m-0 flex list-none flex-col gap-2 p-0 text-body-md">
          <li v-for="link in links" :key="link.label">
            <router-link :to="link.to" class="text-muted-foreground hover:text-foreground">
              {{ link.label }}
            </router-link>
          </li>
        </ul>
      </nav>

      <div>
        <h2 class="mb-3 text-label-sm text-foreground uppercase">Support</h2>
        <ul class="m-0 flex list-none flex-col gap-2 p-0 text-body-md">
          <li class="flex items-center gap-2">
            <MailOutlined aria-hidden="true" />
            <a
              :href="`mailto:${site.support.email}`"
              class="text-muted-foreground hover:text-foreground"
            >
              {{ site.support.email }}
            </a>
          </li>
          <li class="flex items-center gap-2">
            <PhoneOutlined aria-hidden="true" />
            <a :href="site.support.phoneHref" class="text-muted-foreground hover:text-foreground">
              {{ site.support.phone }}
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div class="border-t border-border">
      <p class="mx-auto mb-0 max-w-[1440px] px-4 py-4 text-body-sm md:px-8 xl:px-16">
        © {{ year }} {{ site.name }}
      </p>
    </div>
  </footer>
</template>
