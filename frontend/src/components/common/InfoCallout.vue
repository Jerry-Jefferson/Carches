<script>
import { toneClasses } from '@/theme/tones'

// Icon + optional title + text, e.g. "To finish this trip, contact support"
export default {
  name: 'InfoCallout',
  props: {
    title: { type: String, default: '' },
    // An icon component, e.g. SafetyCertificateOutlined
    icon: { type: [Object, Function], default: null },
    tone: { type: String, default: 'muted' },
  },
  computed: {
    toneClass() {
      return this.tone === 'muted' ? 'bg-muted text-foreground' : toneClasses(this.tone).soft
    },
    iconClass() {
      return this.tone === 'muted' ? 'text-link' : ''
    },
  },
}
</script>

<template>
  <div class="flex gap-3 rounded-card p-4 text-body-md" :class="toneClass" role="note">
    <component
      :is="icon"
      v-if="icon"
      class="mt-0.5 text-lg"
      :class="iconClass"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p v-if="title" class="mb-0.5 text-label-lg">{{ title }}</p>
      <div><slot /></div>
    </div>
  </div>
</template>
