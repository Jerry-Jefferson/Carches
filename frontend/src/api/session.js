import { installInterceptors } from './http'

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

/**
 * Connects the HTTP instance to the auth store and router: sends the token with
 * every request and, on a 401 (expired, revoked or deleted user), clears the
 * session and returns to /auth with the current page in ?redirect=.
 */
export const installSession = (http, { store, router, notify }) =>
  installInterceptors(http, {
    getToken: () => store.state.auth.token,
    onUnauthorized: async () => {
      // Several requests can fail at once; only the first one handles it
      if (!store.state.auth.token) return
      await store.dispatch('auth/clearSession')
      notify.warning(SESSION_EXPIRED_MESSAGE)

      const current = router.currentRoute.value
      if (current.meta.guestOnly) return
      await router.replace({ name: 'auth', query: { redirect: current.fullPath } })
    },
  })
