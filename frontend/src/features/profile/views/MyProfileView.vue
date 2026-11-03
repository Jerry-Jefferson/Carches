<script>
import { CustomerServiceOutlined } from '@ant-design/icons-vue'
import { mapActions, mapGetters } from 'vuex'

import InfoCallout from '@/shared/components/InfoCallout.vue'
import ProfileCard from '@/features/profile/components/ProfileCard.vue'
import { SITE } from '@/shared/constants/site'
import { ROUTE_NAMES } from '@/shared/constants/routes'

// My Profile (E4 on entry, E3 on log out). Details can only be changed by support (G5).
export default {
  name: 'MyProfileView',
  components: { InfoCallout, ProfileCard },
  data() {
    return {
      isLoggingOut: false,
      support: SITE.support,
      supportIcon: CustomerServiceOutlined,
    }
  },
  computed: {
    ...mapGetters('auth', ['user']),
    ...mapGetters('auth', ['isAdmin']),
    adminRoute() {
      return { name: ROUTE_NAMES.ADMIN }
    },
  },
  created() {
    // The session copy may be from the start of the visit; an admin may have changed it
    this.refreshMe().catch(() => {
      // keep showing the session copy; a 401 is handled by the session redirect
    })
  },
  methods: {
    ...mapActions('auth', ['logout', 'refreshMe']),
    async onLogout() {
      this.isLoggingOut = true
      try {
        await this.logout()
        await this.$router.push({ name: ROUTE_NAMES.AUTH })
      } finally {
        this.isLoggingOut = false
      }
    },
  },
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <h1 class="m-0 text-headline-lg">My Profile</h1>

    <template v-if="user">
      <ProfileCard :user="user" />

      <InfoCallout :icon="supportIcon" title="To change your details, contact support">
        Call <a :href="support.phoneHref">{{ support.phone }}</a> or write to
        <a :href="`mailto:${support.email}`">{{ support.email }}</a
        >.
      </InfoCallout>

      <div class="flex flex-col gap-3 sm:flex-row">
        <a-button v-if="isAdmin" type="primary" size="large" @click="$router.push(adminRoute)">
          <template #icon><DashboardOutlined /></template>
          Admin console
        </a-button>
        <a-button size="large" danger :loading="isLoggingOut" @click="onLogout">
          <template #icon><LogoutOutlined /></template>
          Log out
        </a-button>
      </div>
    </template>
  </div>
</template>
