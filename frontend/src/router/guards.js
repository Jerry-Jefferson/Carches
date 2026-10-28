import { SITE } from '@/config/site'

// Accepts only in-app paths ("/cars/1"), never "//evil.com" or "https://…"
export const safeRedirect = (value) =>
  typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : null

/**
 * Access rules, in order:
 * 1. restore the stored session once (auth/bootstrap → GET /users/me);
 * 2. guests may open only `guestOnly` routes (/auth) — anything else redirects there,
 *    keeping the target in ?redirect=;
 * 3. signed-in users are sent from /auth to the fleet;
 * 4. routes with `meta.roles` need one of those roles, otherwise → fleet + onForbidden().
 */
export const createAuthGuard =
  (store, { onForbidden } = {}) =>
  async (to) => {
    await store.dispatch('auth/bootstrap')

    const isAuthenticated = store.getters['auth/isAuthenticated']
    const guestOnly = to.matched.some((record) => record.meta.guestOnly)

    if (!isAuthenticated) {
      return guestOnly ? true : { name: 'auth', query: { redirect: to.fullPath } }
    }
    if (guestOnly) return { name: 'fleet' }

    const roles = to.matched.flatMap((record) => record.meta.roles ?? [])
    if (roles.length && !roles.includes(store.state.auth.user.role)) {
      onForbidden?.(to)
      return { name: 'fleet' }
    }
    return true
  }

export const setDocumentTitle = (to) => {
  const title = to.matched.findLast((record) => record.meta.title)?.meta.title
  document.title = title ? `${title} — ${SITE.name}` : SITE.name
}
