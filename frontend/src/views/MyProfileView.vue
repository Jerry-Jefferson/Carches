<script>
import { CustomerServiceOutlined } from '@ant-design/icons-vue'
import { mapActions, mapGetters } from 'vuex'

import InfoCallout from '@/components/common/InfoCallout.vue'
import ProfileCard from '@/components/profile/ProfileCard.vue'
import { ROUTES } from '@/router/routes.constants'

// My Profile (E4 on entry, E3 on log out). Details can only be changed by support (G5).
export default {
  name: 'MyProfileView',
  components: { InfoCallout, ProfileCard },
  data() {
    return {
      isLoggingOut: false,
      supportIcon: CustomerServiceOutlined,
    }
  },
  computed: {
    ...mapGetters('auth', ['user']),
    ...mapGetters('auth', ['isAdmin']),
    adminRoute() {
      return { name: ROUTES.ADMIN.NAME }
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
        await this.$router.push({ name: ROUTES.AUTH.NAME })
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
        Call <a href="tel:+375170000000">+375 17 000-00-00</a> or write to
        <a href="mailto:support@carshes.by">support@carshes.by</a>.
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
