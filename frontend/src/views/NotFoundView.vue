<script>
export default {
  name: 'NotFoundView',
}
</script>

<template>
  <a-result
    status="404"
    title="Page not found"
    sub-title="The page you are looking for does not exist."
  >
    <template #extra>
      <a-button type="primary" @click="$router.push({ name: 'fleet' })">Back to fleet</a-button>
    </template>
  </a-result>
</template>
