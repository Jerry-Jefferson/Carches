<script>
const DEBOUNCE_MS = 300

// Car search. Writes `?q=` on /fleet (live, debounced); elsewhere Enter opens /fleet?q=…
// The fleet page reads its filters from the URL.
export default {
  name: 'HeaderSearch',
  emits: ['search'],
  data() {
    return {
      text: this.$route.query.q ?? '',
    }
  },
  computed: {
    isOnFleet() {
      return this.$route.name === 'fleet'
    },
  },
  watch: {
    '$route.query.q'(value) {
      if ((value ?? '') !== this.text.trim()) this.text = value ?? ''
    },
  },
  beforeUnmount() {
    clearTimeout(this.debounceTimer)
  },
  methods: {
    queryWith(text) {
      const query = this.isOnFleet ? { ...this.$route.query } : {}
      const q = text.trim()
      if (q) query.q = q
      else delete query.q
      return query
    },
    onInput(value) {
      this.text = value
      if (!this.isOnFleet) return
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.$router.replace({ name: 'fleet', query: this.queryWith(this.text) })
      }, DEBOUNCE_MS)
    },
    submit() {
      clearTimeout(this.debounceTimer)
      const location = { name: 'fleet', query: this.queryWith(this.text) }
      if (this.isOnFleet) this.$router.replace(location)
      else this.$router.push(location)
      this.$emit('search')
    },
  },
}
</script>

<template>
  <form role="search" class="w-full" @submit.prevent="submit">
    <a-input
      :value="text"
      placeholder="Search cars…"
      aria-label="Search cars by brand, model or plate"
      allow-clear
      class="rounded-full"
      @update:value="onInput"
    >
      <template #prefix>
        <SearchOutlined class="text-muted-foreground" aria-hidden="true" />
      </template>
    </a-input>
  </form>
</template>
