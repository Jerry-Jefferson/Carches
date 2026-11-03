<script>
import { ROUTE_NAMES } from '@/shared/constants/routes'

export default {
  name: 'NotFoundView',
  computed: {
    fleetRoute() {
      return { name: ROUTE_NAMES.FLEET }
    },
  },
}
</script>

<template>
  <a-result status="404" sub-title="The page you are looking for does not exist.">
    <!-- a-result renders its title as a div: the page needs a real h1 -->
    <template #title>
      <h1 class="m-0 text-headline-md">Page not found</h1>
    </template>
    <template #extra>
      <a-button type="primary" @click="$router.push(fleetRoute)">Back to fleet</a-button>
    </template>
  </a-result>
</template>
