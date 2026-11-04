import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { clearToken, loadToken, saveToken, tokenExpiresAt } from '@/services/tokenStorage'

const KEY = 'carshes.token'
const NOW = Date.parse('2026-11-04T12:00:00Z')

// An unsigned JWT-shaped token: only its payload is read on the client
const jwt = (payload) =>
  ['header', btoa(JSON.stringify(payload)).replace(/=+$/, ''), 'signature'].join('.')
const valid = (name) => jwt({ sub: name, exp: NOW / 1000 + 3600 })
const expired = (name) => jwt({ sub: name, exp: NOW / 1000 - 1 })

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps remembered tokens in localStorage', () => {
    saveToken('abc', { remember: true })

    expect(localStorage.getItem(KEY)).toBe('abc')
    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(loadToken()).toBe('abc')
  })

  it('keeps other tokens in sessionStorage', () => {
    saveToken('abc')

    expect(localStorage.getItem(KEY)).toBeNull()
    expect(loadToken()).toBe('abc')
  })

  it("replaces the previous user's remembered session on a new sign-in", () => {
    // A shared computer: user A ticked "Remember me", user B signs in without it
    saveToken('user-a', { remember: true })
    saveToken('user-b')
    clearToken('user-b') // B logs out

    expect(loadToken()).toBeNull()
  })

  it("prefers this tab's own token over the remembered one", () => {
    // Another tab remembered user B after this tab signed in as user A for itself only
    sessionStorage.setItem(KEY, 'user-a')
    localStorage.setItem(KEY, 'user-b')

    expect(loadToken()).toBe('user-a')
  })

  it('clears its own token', () => {
    saveToken('abc', { remember: true })

    clearToken('abc')

    expect(loadToken()).toBeNull()
  })

  it("leaves another tab's newer remembered token alone", () => {
    // This tab's old token expired; another tab has since remembered a new one
    localStorage.setItem(KEY, 'newer')
    sessionStorage.setItem(KEY, 'expired')

    clearToken('expired')

    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('newer')
  })

  describe('expiry', () => {
    it('reads exp from the token payload, in ms', () => {
      expect(tokenExpiresAt(jwt({ exp: 1800000000 }))).toBe(1800000000 * 1000)
      expect(tokenExpiresAt(jwt({ sub: 'no exp' }))).toBeNull()
      expect(tokenExpiresAt('not-a-jwt')).toBeNull()
    })

    it('drops an expired token and falls back to the remembered one', () => {
      sessionStorage.setItem(KEY, expired('tab'))
      localStorage.setItem(KEY, valid('remembered'))

      expect(loadToken(NOW)).toBe(valid('remembered'))
      expect(sessionStorage.getItem(KEY)).toBeNull()
    })

    it('returns nothing when every stored token has expired', () => {
      localStorage.setItem(KEY, expired('remembered'))

      expect(loadToken(NOW)).toBeNull()
      expect(localStorage.getItem(KEY)).toBeNull()
    })

    it('leaves a token without a readable exp to the backend', () => {
      sessionStorage.setItem(KEY, 'opaque')

      expect(loadToken(NOW)).toBe('opaque')
    })
  })

  it('treats blocked storage as empty instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => saveToken('abc', { remember: true })).not.toThrow()
    expect(() => clearToken('abc')).not.toThrow()
    expect(loadToken()).toBeNull()
  })
})
