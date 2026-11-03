<script>
import CarCard from './CarCard.vue'

const SKELETON_COUNT = 8

// Responsive card grid (1 → 2 → 3 → 4 columns) with skeletons and "Show more"
export default {
  name: 'CarGrid',
  components: { CarCard },
  props: {
    cars: { type: Array, required: true },
    // { [carId]: metres }
    distances: { type: Object, default: () => ({}) },
    isLoading: { type: Boolean, default: false },
    hasMore: { type: Boolean, default: false },
    total: { type: Number, default: 0 },
  },
  emits: ['book', 'show-more'],
  data() {
    return { skeletons: SKELETON_COUNT }
  },
  computed: {
    showSkeletons() {
      return this.isLoading && this.cars.length === 0
    },
  },
  methods: {
    distanceOf(car) {
      return this.distances[car._id] ?? null
    },
  },
}
</script>

<template>
  <div>
    <ul
      class="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6"
      :aria-busy="isLoading"
      aria-label="Cars"
    >
      <template v-if="showSkeletons">
        <li
          v-for="index in skeletons"
          :key="`skeleton-${index}`"
          class="rounded-card bg-card p-4 shadow-card"
          aria-hidden="true"
        >
          <div class="mb-4 aspect-[16/10] w-full animate-pulse rounded-card bg-muted" />
          <a-skeleton active :paragraph="{ rows: 3 }" />
        </li>
      </template>
      <li v-for="car in cars" v-else :key="car._id">
        <CarCard :car="car" :distance="distanceOf(car)" @book="$emit('book', $event)" />
      </li>
    </ul>

    <div v-if="hasMore" class="mt-8 flex flex-col items-center gap-2">
      <p class="m-0 text-body-sm text-muted-foreground">
        Showing {{ cars.length }} of {{ total }} cars
      </p>
      <a-button size="large" @click="$emit('show-more')">Show more</a-button>
    </div>
  </div>
</template>
