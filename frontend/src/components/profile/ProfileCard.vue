<script>
import InitialsAvatar from '@/components/common/InitialsAvatar.vue'
import { formatDate } from '@/utils/format/dateTime'

// The signed-in user's details (E4). Read-only: there is no self-update endpoint (G5).
export default {
  name: 'ProfileCard',
  components: { InitialsAvatar },
  props: {
    user: { type: Object, required: true },
  },
  computed: {
    fullName() {
      return [this.user.firstName, this.user.lastName].filter(Boolean).join(' ') || this.user.email
    },
    isAdmin() {
      return this.user.role === 'admin'
    },
    memberSince() {
      return formatDate(this.user.createdAt)
    },
    // Rows of the profile table
    details() {
      return [
        { label: 'E-mail', value: this.user.email },
        { label: 'Driving licence', value: this.user.licenseNumber },
        { label: 'First name', value: this.user.firstName },
        { label: 'Last name', value: this.user.lastName },
      ]
    },
  },
}
</script>

<template>
  <section
    class="flex flex-col gap-6 rounded-dialog bg-card p-5 text-card-foreground shadow-card md:p-8"
    aria-labelledby="profile-name"
  >
    <div class="flex items-center gap-4">
      <InitialsAvatar :user="user" :size="72" class="text-headline-md" />
      <div class="min-w-0">
        <h2 id="profile-name" class="m-0 truncate text-headline-md">{{ fullName }}</h2>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <span
            v-if="isAdmin"
            class="inline-flex items-center gap-1 rounded-full bg-info/15 px-2.5 py-0.5 text-label-md text-info"
          >
            <SafetyCertificateOutlined aria-hidden="true" />
            Administrator
          </span>
          <span class="text-body-sm text-muted-foreground">Member since {{ memberSince }}</span>
        </div>
      </div>
    </div>

    <a-descriptions :column="{ xs: 1, sm: 1, md: 2 }" bordered size="middle">
      <a-descriptions-item v-for="row in details" :key="row.label" :label="row.label">
        {{ row.value }}
      </a-descriptions-item>
    </a-descriptions>
  </section>
</template>
