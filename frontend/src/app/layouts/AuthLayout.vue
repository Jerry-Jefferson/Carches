<script>
// Centred column for the sign-in / register card; no header or footer
export default {
  name: 'AuthLayout',
}
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10"
  >
    <div
      class="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/40 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-secondary/25 blur-3xl"
      aria-hidden="true"
    />
    <main id="main" class="relative w-full max-w-xl">
      <slot />
    </main>
  </div>
</template>
