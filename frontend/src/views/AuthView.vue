<script>
import AuthCard from '@/components/auth/AuthCard.vue'
import AuthTabs from '@/components/auth/AuthTabs.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import SignInForm from '@/components/auth/SignInForm.vue'
import { SITE } from '@/constants/site'
import { safeRedirect } from '@/router/guards'
import notify from '@/utils/notify'

// /auth?mode=signin|signup&redirect=/path — the only page guests can open
export default {
  name: 'AuthView',
  components: { AuthCard, AuthTabs, SignInForm, RegisterForm },
  data() {
    return {
      // Shared by both forms so switching tabs keeps what was typed
      email: '',
    }
  },
  computed: {
    mode() {
      return this.$route.query.mode === 'signup' ? 'signup' : 'signin'
    },
    heading() {
      return this.mode === 'signup' ? `Create a ${SITE.name} account` : `Sign in to ${SITE.name}`
    },
  },
  methods: {
    // Keeps ?redirect= and other query params; the form remounts, which clears its errors
    setMode(mode) {
      this.$router.replace({ query: { ...this.$route.query, mode } })
    },
    async onSuccess(user, { isNew = false } = {}) {
      if (isNew) notify.success(`Welcome to ${SITE.name}, ${user.firstName}!`)
      const target = safeRedirect(this.$route.query.redirect) ?? { name: 'fleet' }
      await this.$router.replace(target)
    },
  },
}
</script>

<template>
  <AuthCard>
    <h1 class="sr-only">{{ heading }}</h1>
    <AuthTabs :mode="mode" @update:mode="setMode" />
    <div id="auth-panel" role="tabpanel" :aria-labelledby="`auth-tab-${mode}`">
      <SignInForm
        v-if="mode === 'signin'"
        key="signin"
        :email="email"
        @update:email="email = $event"
        @success="onSuccess"
      />
      <RegisterForm
        v-else
        key="signup"
        :email="email"
        @update:email="email = $event"
        @success="onSuccess($event, { isNew: true })"
      />
    </div>
  </AuthCard>
</template>
