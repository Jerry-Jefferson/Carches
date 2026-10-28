<script>
// Single-choice pills with optional counts: brand filters, status filters, section tabs.
// Use with v-model; options are { value, label, count?, icon?, disabled? }.
export default {
  name: 'PillGroup',
  props: {
    modelValue: { type: [String, Number, Boolean], default: null },
    options: { type: Array, required: true },
    ariaLabel: { type: String, required: true },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['sm', 'md'].includes(value),
    },
  },
  emits: ['update:modelValue'],
  computed: {
    sizeClass() {
      return this.size === 'sm' ? 'h-8 px-3 text-label-md' : 'h-10 px-4 text-label-lg'
    },
  },
  methods: {
    select(option) {
      if (option.disabled || option.value === this.modelValue) return
      this.$emit('update:modelValue', option.value)
    },
  },
}
</script>

<template>
  <div class="flex flex-wrap gap-2" role="group" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="inline-flex items-center gap-2 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      :class="[
        sizeClass,
        option.value === modelValue
          ? 'bg-primary text-primary-foreground shadow-card'
          : 'bg-muted text-muted-foreground hover:bg-accent/40 hover:text-foreground',
      ]"
      :aria-pressed="option.value === modelValue"
      :disabled="option.disabled"
      @click="select(option)"
    >
      <component :is="option.icon" v-if="option.icon" aria-hidden="true" />
      {{ option.label }}
      <span
        v-if="option.count !== undefined"
        class="rounded-full bg-surface/60 px-1.5 text-label-sm"
        :aria-label="`${option.count} items`"
      >
        {{ option.count }}
      </span>
    </button>
  </div>
</template>
