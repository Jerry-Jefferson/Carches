<script>
// A failed load, with the backend message and a retry button
export default {
  name: 'ErrorState',
  props: {
    title: { type: String, default: 'Something went wrong' },
    message: { type: String, default: '' },
    retryLabel: { type: String, default: 'Retry' },
    retrying: { type: Boolean, default: false },
  },
  emits: ['retry'],
}
</script>

<template>
  <a-alert type="error" show-icon :message="title" :description="message || undefined">
    <template v-if="retryLabel" #action>
      <a-button size="small" :loading="retrying" @click="$emit('retry')">{{ retryLabel }}</a-button>
    </template>
  </a-alert>
</template>
