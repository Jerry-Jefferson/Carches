import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'

import http, { NETWORK_ERROR_MESSAGE } from '@/services/http'
import { SESSION_EXPIRED_MESSAGE } from '@/services/interceptors'
import router from '@/router'
import store from '@/store'
import notify from '@/utils/notify'

// The interceptors use the app's store and router singletons: replace them with a store
// holding only the auth module and a router with two pages.
vi.mock('@/store', async () => {
  const { createStore } = await import('vuex')
  const { default: auth } = await import('@/store/modules/auth')
  return { default: createStore({ strict: true, modules: { auth } }) }
})
vi.mock('@/router', async () => {
  const { createRouter, createMemoryHistory } = await import('vue-router')
  return {
    default: createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/auth', name: 'auth', component: {}, meta: { guestOnly: true } },
        { path: '/trips', name: 'my-trips', component: {} },
      ],
    }),
  }
})
vi.mock('@/utils/notify', () => ({ default: { warning: vi.fn() } }))

// Answers every request with `reply(config)` instead of going to the network
const respondWith = (reply) => {
  http.defaults.adapter = async (config) => {
    const { status, data } = reply(config)
    const response = { status, data, headers: {}, config, statusText: '' }
    if (status >= 400) {
      throw new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response)
    }
    return response
  }
}

const expired = () => ({ status: 401, data: { statusCode: 401, message: 'Token has expired' } })

describe('interceptors', () => {
  beforeEach(async () => {
    vi.mocked(notify.warning).mockClear()
    store.commit('auth/SET_SESSION', { user: { role: 'user' }, token: 'jwt' })
    await router.push('/trips?status=active')
  })

  it('sends the store token as a Bearer header', async () => {
    const seen = []
    respondWith((config) => {
      seen.push(config.headers.Authorization)
      return { status: 200, data: {} }
    })

    await http.get('/cars')
    store.commit('auth/CLEAR_SESSION')
    await http.get('/cars')

    expect(seen).toEqual(['Bearer jwt', undefined])
  })

  it('rejects with the backend statusCode and message', async () => {
    respondWith(() => ({
      status: 409,
      data: { status: 'error', statusCode: 409, message: 'A user with this email already exists' },
    }))

    const error = await http.post('/auth/signup').catch((err) => err)

    expect(error.statusCode).toBe(409)
    expect(error.message).toBe('A user with this email already exists')
    expect(error.response.status).toBe(409)
  })

  it('uses the network message when there is no response', async () => {
    http.defaults.adapter = (config) =>
      Promise.reject(new axios.AxiosError('Network Error', 'ERR_NETWORK', config))

    const error = await http.get('/cars').catch((err) => err)

    expect(error).toMatchObject({ statusCode: null, message: NETWORK_ERROR_MESSAGE })
    expect(store.state.auth.token).toBe('jwt')
  })

  it('on a 401 clears the session and returns to /auth with a redirect', async () => {
    respondWith(expired)

    await expect(http.get('/bookings/my')).rejects.toMatchObject({ message: 'Token has expired' })

    expect(store.state.auth.token).toBeNull()
    expect(notify.warning).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE)
    // The redirect is not awaited by the request
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('auth'))
    expect(router.currentRoute.value.query.redirect).toBe('/trips?status=active')
  })

  it('handles several failing requests only once', async () => {
    respondWith(expired)

    await Promise.allSettled([http.get('/cars'), http.get('/bookings/my'), http.get('/users/me')])

    expect(notify.warning).toHaveBeenCalledTimes(1)
  })

  it('keeps a newer session when a request sent with an old token answers 401', async () => {
    let answer
    http.defaults.adapter = (config) =>
      new Promise((resolve, reject) => {
        const response = { ...expired(), headers: {}, config, statusText: '' }
        answer = () =>
          reject(new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response))
      })
    const slow = http.get('/bookings/my').catch((err) => err)
    await vi.waitFor(() => expect(answer).toBeTypeOf('function'))

    // The user signs in again before the old request answers
    store.commit('auth/SET_SESSION', { user: { role: 'user' }, token: 'new-jwt' })
    answer()

    expect(await slow).toMatchObject({ statusCode: 401 })
    expect(store.state.auth.token).toBe('new-jwt')
    expect(notify.warning).not.toHaveBeenCalled()
  })

  it.each(['/auth/signin', '/auth/signup'])('keeps the session on a 401 from %s', async (url) => {
    respondWith(() => ({ status: 401, data: { message: 'Invalid email or password' } }))

    await expect(http.post(url)).rejects.toMatchObject({ statusCode: 401 })
    expect(store.state.auth.token).toBe('jwt')
  })

  it('keeps the session on a 401 from a request made with skipAuthRedirect', async () => {
    respondWith(expired)

    await expect(http.get('/users/me', { skipAuthRedirect: true })).rejects.toBeTruthy()
    expect(store.state.auth.token).toBe('jwt')
  })

  it('keeps the session on a 403', async () => {
    respondWith(() => ({ status: 403, data: { message: 'No permission' } }))

    await expect(http.get('/users')).rejects.toMatchObject({ statusCode: 403 })
    expect(store.state.auth.token).toBe('jwt')
    expect(notify.warning).not.toHaveBeenCalled()
  })
})

describe('session expiry', () => {
  const NOW = Date.parse('2026-11-04T12:00:00Z')
  const HOUR = 3600000
  // An unsigned JWT-shaped token: only its `exp` is read on the client
  const tokenExpiringIn = (ms) =>
    ['header', btoa(JSON.stringify({ exp: (NOW + ms) / 1000 })), 'signature'].join('.')

  beforeEach(async () => {
    vi.mocked(notify.warning).mockClear()
    store.commit('auth/CLEAR_SESSION')
    await router.push('/trips')
    vi.useFakeTimers({ now: NOW, toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  })

  afterEach(() => {
    store.commit('auth/CLEAR_SESSION')
    vi.useRealTimers()
  })

  it('ends the session when the token expires, without waiting for a request', async () => {
    store.commit('auth/SET_SESSION', { user: { role: 'user' }, token: tokenExpiringIn(HOUR) })

    await vi.advanceTimersByTimeAsync(HOUR - 1000)
    expect(store.state.auth.token).not.toBeNull()

    await vi.advanceTimersByTimeAsync(1000)
    expect(store.state.auth.token).toBeNull()
    expect(notify.warning).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('auth'))
  })

  it('follows a new sign-in and stops after sign-out', async () => {
    store.commit('auth/SET_SESSION', { user: { role: 'user' }, token: tokenExpiringIn(60000) })
    store.commit('auth/SET_SESSION', { user: { role: 'user' }, token: tokenExpiringIn(HOUR) })

    await vi.advanceTimersByTimeAsync(2 * 60000)
    expect(store.state.auth.token).not.toBeNull()

    store.commit('auth/CLEAR_SESSION')
    await vi.advanceTimersByTimeAsync(HOUR)
    expect(notify.warning).not.toHaveBeenCalled()
  })

  it('waits in steps when the token lasts longer than setTimeout allows', async () => {
    const days = (n) => n * 24 * HOUR
    store.commit('auth/SET_SESSION', { user: { role: 'user' }, token: tokenExpiringIn(days(30)) })

    await vi.advanceTimersByTimeAsync(days(29))
    expect(store.state.auth.token).not.toBeNull()

    await vi.advanceTimersByTimeAsync(days(1))
    expect(store.state.auth.token).toBeNull()
  })
})
