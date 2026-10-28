import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import { SESSION_EXPIRED_MESSAGE, installSession } from '@/api/session'
import auth from '@/store/modules/auth'

const unauthorized = (config) =>
  Promise.reject(
    new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
      status: 401,
      data: { statusCode: 401, message: 'Token has expired' },
      headers: {},
      config,
    }),
  )

describe('installSession', () => {
  let http
  let store
  let router
  let notify
  let eject

  beforeEach(async () => {
    http = axios.create({ adapter: unauthorized })
    store = createStore({ strict: true, modules: { auth } })
    store.commit('auth/SET_SESSION', { user: { role: 'user' }, token: 'jwt', remember: false })
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/auth', name: 'auth', component: {}, meta: { guestOnly: true } },
        { path: '/trips', name: 'my-trips', component: {} },
      ],
    })
    await router.push('/trips?status=active')
    notify = { warning: vi.fn() }
    eject = installSession(http, { store, router, notify })
  })

  afterEach(() => {
    eject()
  })

  it('clears the session and returns to /auth with a redirect', async () => {
    await expect(http.get('/bookings/my')).rejects.toBeTruthy()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('auth'))

    expect(store.state.auth.token).toBeNull()
    expect(router.currentRoute.value.query.redirect).toBe('/trips?status=active')
    expect(notify.warning).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE)
  })

  it('handles several failing requests only once', async () => {
    await Promise.allSettled([http.get('/cars'), http.get('/bookings/my'), http.get('/users/me')])
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('auth'))

    expect(notify.warning).toHaveBeenCalledTimes(1)
  })

  it('sends the store token with requests', async () => {
    const seen = []
    http.defaults.adapter = (config) => {
      seen.push(config.headers.Authorization)
      return Promise.resolve({ status: 200, data: {}, headers: {}, config })
    }

    await http.get('/cars')

    expect(seen).toEqual(['Bearer jwt'])
  })
})
