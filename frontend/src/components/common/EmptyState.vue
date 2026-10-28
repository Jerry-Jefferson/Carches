<script>
import { SearchOutlined } from '@ant-design/icons-vue'

export default {
  name: 'EmptyState',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
    icon: { type: [Object, Function], default: () => SearchOutlined },
  },
  emits: ['action'],
}
</script>

<template>
  <a-empty class="py-10">
    <template #image>
      <span
        class="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-3xl text-secondary-hover"
        aria-hidden="true"
      >
        <component :is="icon" />
      </span>
    </template>
    <template #description>
      <p class="mb-1 text-headline-sm text-foreground">{{ title }}</p>
      <p v-if="description" class="text-body-md text-muted-foreground">{{ description }}</p>
    </template>
    <a-button v-if="actionLabel" type="primary" @click="$emit('action')">{{
      actionLabel
    }}</a-button>
    <slot />
  </a-empty>
</template>
