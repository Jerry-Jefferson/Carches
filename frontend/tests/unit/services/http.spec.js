import { describe, it, expect, afterEach } from 'vitest'
import axios from 'axios'

import {
  NETWORK_ERROR_MESSAGE,
  getErrorMessage,
  normalizeError,
  serverNow,
  trackServerClock,
  unwrap,
} from '@/services/http'

describe('unwrap', () => {
  it('returns the data of the { message, data } envelope', () => {
    expect(unwrap({ data: { message: 'ok', data: [1] } })).toEqual([1])
    expect(unwrap({ data: '' })).toBeUndefined()
  })
})

describe('serverNow', () => {
  afterEach(() => {
    trackServerClock({ headers: { date: new Date().toUTCString() } })
  })

  it('follows the Date header of the last response', () => {
    trackServerClock({ headers: { date: new Date(Date.now() + 3600000).toUTCString() } })
    expect(serverNow() - Date.now()).toBeGreaterThan(3590000)
  })

  it('ignores responses without a usable Date header', () => {
    trackServerClock({ headers: { date: new Date(Date.now() - 3600000).toUTCString() } })
    trackServerClock({ headers: {} })
    trackServerClock({ headers: { date: 'nonsense' } })
    expect(Date.now() - serverNow()).toBeGreaterThan(3590000)
  })
})

describe('normalizeError', () => {
  const backendError = (status, data) =>
    new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', {}, null, {
      status,
      data,
      headers: {},
      config: {},
    })

  it('adds the backend statusCode and message, keeping the response', () => {
    const error = normalizeError(
      backendError(409, { statusCode: 409, message: 'A user with this email already exists' }),
    )

    expect(error.statusCode).toBe(409)
    expect(error.message).toBe('A user with this email already exists')
    expect(error.response.status).toBe(409)
    expect(getErrorMessage(error)).toBe('A user with this email already exists')
  })

  it('falls back to the HTTP status and the network message', () => {
    expect(normalizeError(backendError(502, '<html>'))).toMatchObject({
      statusCode: 502,
      message: NETWORK_ERROR_MESSAGE,
    })
    expect(normalizeError(new axios.AxiosError('Network Error', 'ERR_NETWORK'))).toMatchObject({
      statusCode: null,
      message: NETWORK_ERROR_MESSAGE,
    })
  })
})
