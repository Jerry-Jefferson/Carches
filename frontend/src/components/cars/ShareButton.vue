<script>
import { copyText } from '@/utils/clipboard'
import notify from '@/utils/notify'

// Shares the current page with the Web Share API, or copies its link
export default {
  name: 'ShareButton',
  props: {
    title: { type: String, default: '' },
    // Defaults to the current page
    url: { type: String, default: '' },
  },
  methods: {
    async share() {
      const url = this.url || window.location.href
      if (navigator.share) {
        try {
          await navigator.share({ title: this.title, url })
          return
        } catch (err) {
          // The user closed the share sheet
          if (err?.name === 'AbortError') return
        }
      }
      try {
        await copyText(url)
        notify.success('Link copied')
      } catch {
        // Nothing worked: show the link so it can be copied by hand
        notify.error(`Could not copy the link: ${url}`)
      }
    },
  },
}
</script>

<template>
  <a-button shape="round" class="bg-muted" @click="share">
    <template #icon><ShareAltOutlined /></template>
    Share
  </a-button>
</template>
