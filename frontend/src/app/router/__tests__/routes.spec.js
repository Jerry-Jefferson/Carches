import { describe, it, expect, vi } from 'vitest'

import { ROUTE_NAMES } from '@/shared/constants/routes'
import { routes } from '../index'

vi.mock('@/shared/utils/notify', () => ({ default: { warning: vi.fn() } }))

describe('ROUTE_NAMES', () => {
  const named = routes.filter((route) => route.name).map((route) => route.name)

  it('matches the named routes of the route table one to one', () => {
    expect([...named].sort()).toEqual(Object.values(ROUTE_NAMES).sort())
  })

  it('points every redirect at a known name', () => {
    const targets = routes.filter((route) => route.redirect).map((route) => route.redirect.name)
    targets.forEach((name) => expect(named).toContain(name))
  })

  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(ROUTE_NAMES)).toBe(true)
  })
})
