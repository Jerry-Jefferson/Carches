import { createRouter, createWebHistory } from 'vue-router'

import store from '@/store'
import notify from '@/utils/notify'
import { ROUTES } from './routes.constants'
import { setDocumentTitle } from './guards'

// meta.layout: 'auth' | 'app' (default) | 'admin' — picked by App.vue
// meta.requiresAuth: signed-in users only; meta.guestOnly: signed-out visitors only;
// meta.roles: allowed user roles (implies requiresAuth)
export const ACCESS_DENIED_MESSAGE = "You don't have access to the admin console"

export const routes = [
  {
    path: ROUTES.AUTH.PATH,
    name: ROUTES.AUTH.NAME,
    component: () => import('@/views/AuthView.vue'),
    meta: { layout: 'auth', guestOnly: true, title: 'Sign in' },
  },
  {
    path: ROUTES.HOME.PATH,
    name: ROUTES.HOME.NAME,
    redirect: { name: ROUTES.FLEET.NAME },
  },
  {
    path: ROUTES.FLEET.PATH,
    name: ROUTES.FLEET.NAME,
    component: () => import('@/views/FleetView.vue'),
    meta: { requiresAuth: true, title: 'Fleet' },
  },
  {
    path: ROUTES.CAR_DETAILS.PATH,
    name: ROUTES.CAR_DETAILS.NAME,
    component: () => import('@/views/CarDetailsView.vue'),
    props: true,
    meta: { requiresAuth: true, title: 'Car details' },
  },
  {
    path: ROUTES.MY_TRIPS.PATH,
    name: ROUTES.MY_TRIPS.NAME,
    component: () => import('@/views/MyTripsView.vue'),
    meta: { requiresAuth: true, title: 'My Trips' },
  },
  {
    path: ROUTES.MY_PROFILE.PATH,
    name: ROUTES.MY_PROFILE.NAME,
    component: () => import('@/views/MyProfileView.vue'),
    meta: { requiresAuth: true, title: 'My Profile' },
  },
  {
    path: ROUTES.ADMIN.PATH,
    name: ROUTES.ADMIN.NAME,
    component: () => import('@/views/AdminView.vue'),
    meta: {
      layout: 'admin',
      requiresAuth: true,
      roles: ['admin'],
      title: 'Fleet Dispatch & Control',
    },
  },
  {
    path: ROUTES.NOT_FOUND.PATH,
    name: ROUTES.NOT_FOUND.NAME,
    component: () => import('@/views/NotFoundView.vue'),
    meta: { requiresAuth: true, title: 'Page not found' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, savedPosition) => savedPosition ?? { top: 0 },
})

/**
 * Access rules, in order:
 * 1. restore the stored session once (auth/bootstrap → GET /users/me);
 * 2. `requiresAuth` and `roles` routes send guests to /auth, keeping the target in ?redirect=;
 * 3. `guestOnly` routes (/auth) send signed-in users to the fleet;
 * 4. `roles` routes send other roles to the fleet with a warning.
 * Signed in means a token *and* the user it belongs to: after a network error during
 * step 1 the token stays stored (a reload can restore it) but the user is unknown.
 */
export const authGuard = async (to) => {
  await store.dispatch('auth/bootstrap')
  const isAuthenticated = store.getters['auth/isAuthenticated']
  const roles = to.matched.flatMap((record) => record.meta.roles ?? [])
  const requiresAuth = roles.length > 0 || to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !isAuthenticated) {
    return { name: ROUTES.AUTH.NAME, query: { redirect: to.fullPath } }
  }
  if (to.matched.some((record) => record.meta.guestOnly) && isAuthenticated) {
    return { name: ROUTES.FLEET.NAME }
  }
  if (roles.length && !roles.includes(store.state.auth.user.role)) {
    notify.warning(ACCESS_DENIED_MESSAGE)
    return { name: ROUTES.FLEET.NAME }
  }
  return true
}

router.beforeEach(authGuard)
router.afterEach(setDocumentTitle)

export default router
