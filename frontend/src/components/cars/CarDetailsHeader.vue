<script>
import ShareButton from './ShareButton.vue'

// Top row of the car page: breadcrumb back to the fleet and the share button
export default {
  name: 'CarDetailsHeader',
  components: { ShareButton },
  props: {
    name: { type: String, required: true },
    // The fleet route with the user's last filters
    fleetRoute: { type: Object, default: () => ({ name: 'fleet' }) },
  },
}
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <a-breadcrumb>
      <a-breadcrumb-item>
        <router-link :to="fleetRoute">Fleet</router-link>
      </a-breadcrumb-item>
      <a-breadcrumb-item aria-current="page">{{ name }}</a-breadcrumb-item>
    </a-breadcrumb>
    <ShareButton :title="`${name} on Carshes`" />
  </div>
</template>
