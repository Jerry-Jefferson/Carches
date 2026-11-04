import { describe, it, expect, vi } from 'vitest'

import { routes } from '@/router/index'
import { ROUTES, TAB_NAMES } from '@/router/routes.constants'

vi.mock('@/utils/notify', () => ({ default: { warning: vi.fn() } }))

describe('ROUTES', () => {
  const entries = Object.values(ROUTES)

  it('pairs a PATH and a NAME in every entry', () => {
    entries.forEach((entry) => {
      expect(Object.keys(entry).sort()).toEqual(['NAME', 'PATH'])
      expect(entry.PATH).toEqual(expect.any(String))
      expect(entry.NAME).toEqual(expect.any(String))
    })
  })

  it('matches the route table one to one, names and paths', () => {
    const table = routes.map((route) => ({ NAME: route.name, PATH: route.path }))
    expect(table).toHaveLength(entries.length)
    expect(table).toEqual(expect.arrayContaining(entries))
  })

  it('points every redirect at a known name', () => {
    const names = entries.map((entry) => entry.NAME)
    routes
      .filter((route) => route.redirect)
      .forEach((route) => expect(names).toContain(route.redirect.name))
  })

  it('cannot be changed at runtime, nested entries included', () => {
    expect(Object.isFrozen(ROUTES)).toBe(true)
    entries.forEach((entry) => expect(Object.isFrozen(entry)).toBe(true))
    expect(Object.isFrozen(TAB_NAMES)).toBe(true)
    expect(Object.isFrozen(TAB_NAMES.ADMIN)).toBe(true)
  })
})
