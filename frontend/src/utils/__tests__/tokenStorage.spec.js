import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { clearToken, loadToken, saveToken } from '@/utils/tokenStorage'

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

    expect(localStorage.getItem('carshes.token')).toBe('abc')
    expect(sessionStorage.getItem('carshes.token')).toBeNull()
    expect(loadToken()).toEqual({ token: 'abc', remember: true })
  })

  it('keeps other tokens in sessionStorage', () => {
    saveToken('abc')

    expect(localStorage.getItem('carshes.token')).toBeNull()
    expect(loadToken()).toEqual({ token: 'abc', remember: false })
  })

  it('replaces a token stored in the other storage', () => {
    saveToken('old', { remember: true })
    saveToken('new', { remember: false })

    expect(localStorage.getItem('carshes.token')).toBeNull()
    expect(loadToken()).toEqual({ token: 'new', remember: false })
  })

  it('clears both storages', () => {
    localStorage.setItem('carshes.token', 'a')
    sessionStorage.setItem('carshes.token', 'b')

    clearToken()

    expect(loadToken()).toBeNull()
  })

  it('treats blocked storage as empty instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => saveToken('abc', { remember: true })).not.toThrow()
    expect(loadToken()).toBeNull()
  })
})
