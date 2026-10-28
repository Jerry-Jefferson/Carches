import { createRouter, createWebHistory } from 'vue-router'

import store from '@/store'
import notify from '@/utils/notify'
import { createAuthGuard, setDocumentTitle } from './guards'

// meta.layout: 'auth' | 'app' (default) | 'admin' — picked by App.vue
// meta.guestOnly: only signed-out visitors; meta.roles: allowed user roles
export const routes = [
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/AuthView.vue'),
    meta: { layout: 'auth', guestOnly: true, title: 'Sign in' },
  },
  {
    path: '/',
    redirect: { name: 'fleet' },
  },
  {
    path: '/fleet',
    name: 'fleet',
    component: () => import('@/views/FleetView.vue'),
    meta: { title: 'Fleet' },
  },
  {
    path: '/cars/:id',
    name: 'car-details',
    component: () => import('@/views/CarDetailsView.vue'),
    props: true,
    meta: { title: 'Car details' },
  },
  {
    path: '/trips',
    name: 'my-trips',
    component: () => import('@/views/MyTripsView.vue'),
    meta: { title: 'My Trips' },
  },
  {
    path: '/profile',
    name: 'my-profile',
    component: () => import('@/views/MyProfileView.vue'),
    meta: { title: 'My Profile' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { layout: 'admin', roles: ['admin'], title: 'Fleet Dispatch & Control' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
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
