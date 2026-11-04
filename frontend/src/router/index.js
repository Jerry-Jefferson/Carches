import { createRouter, createWebHistory } from 'vue-router'

import store from '@/store'
import notify from '@/utils/notify'
import { ROUTES } from './routes.constants'
import { createAuthGuard, setDocumentTitle } from './guards'

// meta.layout: 'auth' | 'app' (default) | 'admin' — picked by App.vue
// meta.guestOnly: only signed-out visitors; meta.roles: allowed user roles
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
    meta: { title: 'Fleet' },
  },
  {
    path: ROUTES.CAR_DETAILS.PATH,
    name: ROUTES.CAR_DETAILS.NAME,
    component: () => import('@/views/CarDetailsView.vue'),
    props: true,
    meta: { title: 'Car details' },
  },
  {
    path: ROUTES.MY_TRIPS.PATH,
    name: ROUTES.MY_TRIPS.NAME,
    component: () => import('@/views/MyTripsView.vue'),
    meta: { title: 'My Trips' },
  },
  {
    path: ROUTES.MY_PROFILE.PATH,
    name: ROUTES.MY_PROFILE.NAME,
    component: () => import('@/views/MyProfileView.vue'),
    meta: { title: 'My Profile' },
  },
  {
    path: ROUTES.ADMIN.PATH,
    name: ROUTES.ADMIN.NAME,
    component: () => import('@/views/AdminView.vue'),
    meta: { layout: 'admin', roles: ['admin'], title: 'Fleet Dispatch & Control' },
  },
  {
    path: ROUTES.NOT_FOUND.PATH,
    name: ROUTES.NOT_FOUND.NAME,
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Page not found' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, savedPosition) => savedPosition ?? { top: 0 },
})

router.beforeEach(
  createAuthGuard(store, {
    onForbidden: () => notify.warning("You don't have access to the admin console"),
  }),
)
router.afterEach(setDocumentTitle)

export default router
