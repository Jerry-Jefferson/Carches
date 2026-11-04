import { describe, it, expect } from 'vitest'

import { NETWORK_ERROR_MESSAGE } from '@/services/http'
import { mapAuthError } from '@/utils/formErrors'

describe('mapAuthError', () => {
  it.each([
    ['A user with this email already exists', 'email'],
    ['A user with this license number already exists', 'licenseNumber'],
    ['Email is invalid', 'email'],
    ['Password must be at least 8 characters long', 'password'],
    ['Password cannot exceed 72 bytes', 'password'],
    ['Invalid email or password', null],
    ['licenseNumber, firstName, lastName must be provided as non-empty strings', null],
  ])('maps "%s" to %s', (message, field) => {
    expect(mapAuthError({ message })).toEqual({ field, message })
  })

  it('falls back to the network message', () => {
    expect(mapAuthError({})).toEqual({ field: null, message: NETWORK_ERROR_MESSAGE })
  })
})
