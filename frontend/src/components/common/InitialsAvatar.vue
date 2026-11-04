<script>
import { initials } from '@/utils/format'

// The backend has no avatars; shows the user's initials instead
export default {
  name: 'InitialsAvatar',
  props: {
    user: { type: Object, default: null },
    size: { type: [Number, String], default: 36 },
  },
  computed: {
    text() {
      return initials(this.user)
    },
  },
}
</script>

<template>
  <a-avatar
    :size="size"
    class="shrink-0 bg-primary font-semibold text-primary-foreground"
    aria-hidden="true"
  >
    {{ text }}
  </a-avatar>
</template>
