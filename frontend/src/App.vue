<script>
import { buildAntdTheme } from '@/theme/antd'

export default {
  name: 'App',
  data() {
    return {
      theme: buildAntdTheme(),
    }
  },
  mounted() {
    // Rebuild the Ant Design theme when the `.dark` class on <html> changes
    this.themeObserver = new MutationObserver(() => {
      this.theme = buildAntdTheme()
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
    <router-view />
  </a-config-provider>
</template>
