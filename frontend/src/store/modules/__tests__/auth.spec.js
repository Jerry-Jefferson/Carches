import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'

import * as authApi from '@/api/auth'
import * as usersApi from '@/api/users'
import { loadToken, saveToken } from '@/utils/tokenStorage'
import auth from '../auth'

vi.mock('@/api/auth', () => ({ signIn: vi.fn(), signUp: vi.fn(), logout: vi.fn() }))
vi.mock('@/api/users', () => ({ getMe: vi.fn() }))

const USER = {
  _id: 'u1',
  email: 'vera@carshes.by',
  firstName: 'Vera',
  lastName: 'Davydova',
  role: 'user',
}

const apiError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode, response: { data: { message, statusCode } } })

const makeStore = () => createStore({ strict: true, modules: { auth } })

describe('auth module', () => {
  beforeEach(() => {
    vi.mocked(authApi.signIn).mockReset()
    vi.mocked(authApi.signUp).mockReset()
    vi.mocked(authApi.logout).mockReset()
    vi.mocked(usersApi.getMe).mockReset()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('signIn', () => {
    it('stores the session and remembers the token when asked', async () => {
      vi.mocked(authApi.signIn).mockResolvedValue({ user: USER, token: 'jwt' })
      const store = makeStore()

      await store.dispatch('auth/signIn', {
        email: USER.email,
        password: 'secret123',
        remember: true,
      })

      expect(authApi.signIn).toHaveBeenCalledWith({ email: USER.email, password: 'secret123' })
      expect(store.getters['auth/isAuthenticated']).toBe(true)
      expect(store.state.auth.isSubmitting).toBe(false)
      expect(loadToken()).toEqual({ token: 'jwt', remember: true })
    })

    it('stores the backend error and re-throws', async () => {
      const error = apiError('Invalid email or password', 401)
      vi.mocked(authApi.signIn).mockRejectedValue(error)
      const store = makeStore()

      await expect(store.dispatch('auth/signIn', { email: 'x', password: 'y' })).rejects.toBe(error)
      expect(store.state.auth.error).toBe('Invalid email or password')
      expect(store.getters['auth/isAuthenticated']).toBe(false)
      expect(loadToken()).toBeNull()
    })
  })

  it('signUp signs the new user in for this tab only', async () => {
    vi.mocked(authApi.signUp).mockResolvedValue({ user: USER, token: 'jwt' })
    const store = makeStore()

    await store.dispatch('auth/signUp', { email: USER.email, password: 'secret123' })

    expect(store.state.auth.user).toEqual(USER)
    expect(loadToken()).toEqual({ token: 'jwt', remember: false })
  })

  describe('logout', () => {
    it('clears the session', async () => {
      vi.mocked(authApi.logout).mockResolvedValue()
      const store = makeStore()
      store.commit('auth/SET_SESSION', { user: USER, token: 'jwt', remember: true })
      saveToken('jwt', { remember: true })

      await store.dispatch('auth/logout')

      expect(store.getters['auth/isAuthenticated']).toBe(false)
      expect(loadToken()).toBeNull()
    })

    it('clears the session even when the request fails', async () => {
      vi.mocked(authApi.logout).mockRejectedValue(apiError('Token has expired', 401))
      const store = makeStore()
      store.commit('auth/SET_SESSION', { user: USER, token: 'jwt', remember: false })

      await expect(store.dispatch('auth/logout')).resolves.toBeUndefined()
      expect(store.state.auth.token).toBeNull()
    })
  })

  describe('bootstrap', () => {
    it('is ready immediately without a stored token', async () => {
      const store = makeStore()

      await store.dispatch('auth/bootstrap')

      expect(usersApi.getMe).not.toHaveBeenCalled()
      expect(store.state.auth.status).toBe('ready')
    })

    it('restores a stored session with GET /users/me', async () => {
      saveToken('jwt', { remember: true })
      vi.mocked(usersApi.getMe).mockResolvedValue(USER)
      const store = makeStore()

      await store.dispatch('auth/bootstrap')

      expect(usersApi.getMe).toHaveBeenCalledWith({ skipAuthRedirect: true })
      expect(store.state.auth).toMatchObject({
        user: USER,
        token: 'jwt',
        remember: true,
        status: 'ready',
      })
    })

    it('drops an invalid stored token', async () => {
      saveToken('expired')
      vi.mocked(usersApi.getMe).mockRejectedValue(apiError('Token has expired', 401))
      const store = makeStore()

      await store.dispatch('auth/bootstrap')

      expect(store.getters['auth/isAuthenticated']).toBe(false)
      expect(store.state.auth.status).toBe('ready')
      expect(loadToken()).toBeNull()
    })

    it('runs once for concurrent and later calls', async () => {
      saveToken('jwt')
      vi.mocked(usersApi.getMe).mockResolvedValue(USER)
      const store = makeStore()

      await Promise.all([store.dispatch('auth/bootstrap'), store.dispatch('auth/bootstrap')])
      await store.dispatch('auth/bootstrap')

      expect(usersApi.getMe).toHaveBeenCalledTimes(1)
    })
  })

  describe('getters', () => {
    it('derive the role, name and initials', () => {
      const store = makeStore()
      store.commit('auth/SET_SESSION', { user: { ...USER, role: 'admin' }, token: 'jwt' })

      expect(store.getters['auth/isAdmin']).toBe(true)
      expect(store.getters['auth/fullName']).toBe('Vera Davydova')
      expect(store.getters['auth/initials']).toBe('VD')
    })

    it('are empty for guests', () => {
      const store = makeStore()

      expect(store.getters['auth/isAdmin']).toBe(false)
      expect(store.getters['auth/fullName']).toBe('')
    })
  })
})
