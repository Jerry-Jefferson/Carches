import { describe, it, expect } from 'vitest'

import { fullName, initials } from '@/utils/users/userDisplay'

describe('initials', () => {
  it.each([
    [{ firstName: 'vera', lastName: 'Davydova' }, 'VD'],
    [{ firstName: 'Ivan', lastName: '' }, 'I'],
    [{ firstName: ' ', lastName: ' ', email: 'admin@carshes.by' }, 'A'],
    [null, '?'],
  ])('%o → %s', (user, expected) => {
    expect(initials(user)).toBe(expected)
  })
})

describe('fullName', () => {
  it('joins first and last name, falling back to the e-mail', () => {
    expect(fullName({ firstName: 'Hanna', lastName: 'Paulava' })).toBe('Hanna Paulava')
    expect(fullName({ firstName: '', lastName: '', email: 'h@x.by' })).toBe('h@x.by')
    expect(fullName(null)).toBe('')
  })
})
