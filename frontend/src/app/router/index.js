import { createRouter, createWebHistory } from 'vue-router'

import store from '@/app/store'
import notify from '@/shared/utils/notify'
import { ROUTE_NAMES } from '@/shared/constants/routes'
import { createAuthGuard, setDocumentTitle } from './guards'

// meta.layout: 'auth' | 'app' (default) | 'admin' — picked by App.vue
// meta.guestOnly: only signed-out visitors; meta.roles: allowed user roles
export const routes = [
  {
    path: '/auth',
    name: ROUTE_NAMES.AUTH,
    component: () => import('@/features/auth/views/AuthView.vue'),
    meta: { layout: 'auth', guestOnly: true, title: 'Sign in' },
  },
  {
    path: '/',
    redirect: { name: ROUTE_NAMES.FLEET },
  },
  {
    path: '/fleet',
    name: ROUTE_NAMES.FLEET,
    component: () => import('@/features/cars/views/FleetView.vue'),
    meta: { title: 'Fleet' },
  },
  {
    path: '/cars/:id',
    name: ROUTE_NAMES.CAR_DETAILS,
    component: () => import('@/features/cars/views/CarDetailsView.vue'),
    props: true,
    meta: { title: 'Car details' },
  },
  {
    path: '/trips',
    name: ROUTE_NAMES.MY_TRIPS,
    component: () => import('@/features/bookings/views/MyTripsView.vue'),
    meta: { title: 'My Trips' },
  },
  {
    path: '/profile',
    name: ROUTE_NAMES.MY_PROFILE,
    component: () => import('@/features/profile/views/MyProfileView.vue'),
    meta: { title: 'My Profile' },
  },
  {
    path: '/admin',
    name: ROUTE_NAMES.ADMIN,
    component: () => import('@/features/admin/views/AdminView.vue'),
    meta: { layout: 'admin', roles: ['admin'], title: 'Fleet Dispatch & Control' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@/app/views/NotFoundView.vue'),
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
