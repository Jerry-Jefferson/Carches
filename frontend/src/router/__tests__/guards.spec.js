import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as usersApi from '@/api/users'
import auth from '@/store/modules/auth'
import { saveToken } from '@/utils/tokenStorage'
import { createAuthGuard, safeRedirect, setDocumentTitle } from '../guards'
import { routes } from '../index'

vi.mock('@/api/users', () => ({ getMe: vi.fn() }))
vi.mock('@/utils/notify', () => ({ default: { warning: vi.fn() } }))

const USER = { _id: 'u1', email: 'u@carshes.by', firstName: 'Ivan', lastName: 'P', role: 'user' }
const ADMIN = { ...USER, role: 'admin' }

const setup = () => {
  const store = createStore({ strict: true, modules: { auth } })
  const onForbidden = vi.fn()
  // Real route table with stub components, so meta (guestOnly, roles, title) is what ships
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes.map((route) => (route.component ? { ...route, component: {} } : route)),
  })
  router.beforeEach(createAuthGuard(store, { onForbidden }))
  router.afterEach(setDocumentTitle)
  return { store, router, onForbidden }
}

const signInAs = (store, user) => {
  store.commit('auth/SET_SESSION', { user, token: 'jwt', remember: false })
  store.commit('auth/SET_STATUS', 'ready')
}

describe('auth guard', () => {
  beforeEach(() => {
    vi.mocked(usersApi.getMe).mockReset()
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
      const { router, store, onForbidden } = setup()
      signInAs(store, USER)

      await router.push('/admin')

      expect(router.currentRoute.value.name).toBe('fleet')
      expect(onForbidden).toHaveBeenCalledTimes(1)
    })

    it('with the admin role open /admin', async () => {
      const { router, store, onForbidden } = setup()
      signInAs(store, ADMIN)

      await router.push('/admin?tab=users')

      expect(router.currentRoute.value.name).toBe('admin')
      expect(onForbidden).not.toHaveBeenCalled()
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

describe('safeRedirect', () => {
  it.each([
    ['/fleet', '/fleet'],
    ['/cars/1?x=1#y', '/cars/1?x=1#y'],
    ['//evil.example', null],
    ['/\\evil.example', null],
    ['https://evil.example', null],
    ['fleet', null],
    [undefined, null],
    [['/fleet'], null],
  ])('%o → %o', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected)
  })
})
