<script>
import { ConfigProvider } from 'ant-design-vue'

import AdminLayout from '@/layouts/AdminLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { buildAntdTheme } from '@/theme/antd'

const LAYOUTS = { auth: AuthLayout, app: AppLayout, admin: AdminLayout }

// Static message/notification calls render outside this tree; give them the theme too
const applyGlobalTheme = (theme) => ConfigProvider.config({ theme })

export default {
  name: 'App',
  data() {
    const theme = buildAntdTheme()
    applyGlobalTheme(theme)
    return {
      theme,
    }
  },
  computed: {
    // Nothing is rendered until the first navigation resolves, so guests never see app chrome
    isRouteReady() {
      return this.$route.matched.length > 0
    },
    layout() {
      return LAYOUTS[this.$route.meta.layout] ?? AppLayout
    },
  },
  mounted() {
    // Rebuild the Ant Design theme when the `.dark` class on <html> changes
    this.themeObserver = new MutationObserver(() => {
      this.theme = buildAntdTheme()
      applyGlobalTheme(this.theme)
    })
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  },
  beforeUnmount() {
    this.themeObserver?.disconnect()
  },
}
</script>

<template>
  <a-config-provider :theme="theme">
    <component :is="layout" v-if="isRouteReady">
      <router-view />
    </component>
  </a-config-provider>
</template>
