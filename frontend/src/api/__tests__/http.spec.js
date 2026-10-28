import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'

import { NETWORK_ERROR_MESSAGE, getErrorMessage, installInterceptors, unwrap } from '@/api/http'

// An axios instance whose adapter answers with `reply(config)` instead of the network
const makeInstance = (reply) =>
  axios.create({
    adapter: async (config) => {
      const { status, data } = reply(config)
      const response = { status, data, headers: {}, config, statusText: '' }
      if (status >= 400) {
        throw new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response)
      }
      return response
    },
  })

describe('unwrap', () => {
  it('returns the data of the { message, data } envelope', () => {
    expect(unwrap({ data: { message: 'ok', data: [1] } })).toEqual([1])
    expect(unwrap({ data: '' })).toBeUndefined()
  })
})

describe('installInterceptors', () => {
  let onUnauthorized
  let token
  let eject

  const install = (instance) => {
    eject = installInterceptors(instance, { getToken: () => token, onUnauthorized })
    return instance
  }

  beforeEach(() => {
    onUnauthorized = vi.fn()
    token = 'jwt-123'
  })

  afterEach(() => {
    eject?.()
  })

  it('sends the token as a Bearer header', async () => {
    const seen = []
    const http = install(
      makeInstance((config) => {
        seen.push(config.headers.Authorization)
        return { status: 200, data: {} }
      }),
    )

    await http.get('/cars')
    token = null
    await http.get('/cars')

    expect(seen).toEqual(['Bearer jwt-123', undefined])
  })

  it('normalises backend errors to statusCode + message', async () => {
    const http = install(
      makeInstance(() => ({
        status: 409,
        data: {
          status: 'error',
          statusCode: 409,
          message: 'A user with this email already exists',
        },
      })),
    )

    const error = await http.post('/auth/signup').catch((err) => err)

    expect(error.statusCode).toBe(409)
    expect(error.message).toBe('A user with this email already exists')
    expect(error.response.status).toBe(409)
    expect(getErrorMessage(error)).toBe('A user with this email already exists')
  })

  it('uses the network message when there is no response', async () => {
    const http = install(
      axios.create({
        adapter: (config) =>
          Promise.reject(new axios.AxiosError('Network Error', 'ERR_NETWORK', config)),
      }),
    )

    const error = await http.get('/cars').catch((err) => err)

    expect(error.statusCode).toBeNull()
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports 401s from protected requests', async () => {
    const http = install(
      makeInstance(() => ({
        status: 401,
        data: { statusCode: 401, message: 'Token has expired' },
      })),
    )

    await expect(http.get('/bookings/my')).rejects.toMatchObject({ message: 'Token has expired' })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it.each(['/auth/signin', '/auth/signup'])('does not report 401s from %s', async (url) => {
    const http = install(
      makeInstance(() => ({ status: 401, data: { message: 'Invalid email or password' } })),
    )

    await expect(http.post(url)).rejects.toMatchObject({ statusCode: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('does not report 401s for requests made with skipAuthRedirect', async () => {
    const http = install(makeInstance(() => ({ status: 401, data: { message: 'Invalid token' } })))

    await expect(http.get('/users/me', { skipAuthRedirect: true })).rejects.toBeTruthy()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('does not report 403s', async () => {
    const http = install(makeInstance(() => ({ status: 403, data: { message: 'No permission' } })))

    await expect(http.get('/users')).rejects.toMatchObject({ statusCode: 403 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
