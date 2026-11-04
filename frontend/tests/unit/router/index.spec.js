import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

import * as usersApi from '@/services/users'
import { saveToken } from '@/services/tokenStorage'
import { setDocumentTitle } from '@/router/guards'
import { ACCESS_DENIED_MESSAGE, authGuard, routes } from '@/router/index'
import store from '@/store'
import notify from '@/utils/notify'

vi.mock('@/services/users', () => ({ getMe: vi.fn() }))
vi.mock('@/utils/notify', () => ({ default: { warning: vi.fn() } }))
// The guard reads the app's store singleton: replace it with one holding only auth
vi.mock('@/store', async () => {
  const { createStore } = await import('vuex')
  const { default: auth } = await import('@/store/modules/auth')
  return { default: createStore({ strict: true, modules: { auth } }) }
})

const USER = { _id: 'u1', email: 'u@carshes.by', firstName: 'Ivan', lastName: 'P', role: 'user' }
const ADMIN = { ...USER, role: 'admin' }

const setup = () => {
  // Real route table with stub components, so meta (requiresAuth, guestOnly, roles, title)
  // is what ships
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes.map((route) => (route.component ? { ...route, component: {} } : route)),
  })
  router.beforeEach(authGuard)
  router.afterEach(setDocumentTitle)
  return { store, router }
}

const signInAs = (store, user) => {
  store.commit('auth/SET_SESSION', { user, token: 'jwt' })
  store.commit('auth/SET_STATUS', 'ready')
}

describe('auth guard', () => {
  beforeEach(() => {
    vi.mocked(usersApi.getMe).mockReset()
    vi.mocked(notify.warning).mockClear()
    store.commit('auth/CLEAR_SESSION')
    store.commit('auth/SET_STATUS', 'idle')
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('guests', () => {
    it.each(['/fleet', '/cars/abc', '/trips', '/profile', '/admin', '/no-such-page'])(
      'are sent from %s to /auth with a redirect',
      async (path) => {
        const { router } = setup()

        await router.push(path)

        expect(router.currentRoute.value.name).toBe('auth')
        expect(router.currentRoute.value.query.redirect).toBe(path)
      },
    )

    it('reach /auth', async () => {
      const { router } = setup()

      await router.push('/auth?mode=signup')

      expect(router.currentRoute.value.fullPath).toBe('/auth?mode=signup')
    })

    it('land on /auth?redirect=/fleet from /', async () => {
      const { router } = setup()

      await router.push('/')

      expect(router.currentRoute.value.query.redirect).toBe('/fleet')
    })

    it('are sent to /auth from a roles route that lacks requiresAuth', async () => {
      const { router } = setup()
      router.addRoute({
        path: '/reports',
        name: 'reports',
        component: {},
        meta: { roles: ['admin'] },
      })

      await router.push('/reports')

      expect(router.currentRoute.value.name).toBe('auth')
      expect(router.currentRoute.value.query.redirect).toBe('/reports')
      expect(notify.warning).not.toHaveBeenCalled()
    })
  })

  describe('signed-in users', () => {
    it('are sent from /auth to the fleet', async () => {
      const { router, store } = setup()
      signInAs(store, USER)

      await router.push('/auth')

      expect(router.currentRoute.value.name).toBe('fleet')
    })

    it('open app pages and the not-found page', async () => {
      const { router, store } = setup()
      signInAs(store, USER)

      await router.push('/trips')
      expect(router.currentRoute.value.name).toBe('my-trips')
      await router.push('/no-such-page')
      expect(router.currentRoute.value.name).toBe('not-found')
    })

    it('without the admin role are kept out of /admin', async () => {
      const { router, store } = setup()
      signInAs(store, USER)

      await router.push('/admin')

      expect(router.currentRoute.value.name).toBe('fleet')
      expect(notify.warning).toHaveBeenCalledExactlyOnceWith(ACCESS_DENIED_MESSAGE)
    })

    it('with the admin role open /admin', async () => {
      const { router, store } = setup()
      signInAs(store, ADMIN)

      await router.push('/admin?tab=users')

      expect(router.currentRoute.value.name).toBe('admin')
      expect(notify.warning).not.toHaveBeenCalled()
    })
  })

  it('restores a stored session before deciding', async () => {
    saveToken('jwt', { remember: true })
    vi.mocked(usersApi.getMe).mockResolvedValue(ADMIN)
    const { router } = setup()

    await router.push('/admin')

    expect(router.currentRoute.value.name).toBe('admin')
  })

  it('treats a rejected stored token as a guest', async () => {
    saveToken('revoked')
    vi.mocked(usersApi.getMe).mockRejectedValue(new Error('Token has been revoked'))
    const { router } = setup()

    await router.push('/trips')

    expect(router.currentRoute.value.name).toBe('auth')
  })

  it('sets the document title', async () => {
    const { router, store } = setup()
    signInAs(store, USER)

    await router.push('/trips')

    expect(document.title).toBe('My Trips — Carshes')
  })
})

describe('route meta', () => {
  it('marks every page except /auth as requiresAuth, and /auth as guestOnly', () => {
    const pages = routes.filter((route) => route.component)
    for (const route of pages) {
      expect(Boolean(route.meta.requiresAuth), route.name).toBe(!route.meta.guestOnly)
    }
    expect(pages.filter((route) => route.meta.guestOnly).map((route) => route.name)).toEqual([
      'auth',
    ])
  })
})
