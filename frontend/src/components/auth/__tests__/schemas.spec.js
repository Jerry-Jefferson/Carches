import { describe, it, expect } from 'vitest'

import { NETWORK_ERROR_MESSAGE } from '@/api/http'
import { mapAuthError, registerSchema, signInSchema } from '../schemas'

const VALID_PROFILE = {
  firstName: 'Vera',
  lastName: 'Davydova',
  licenseNumber: 'mp1234567',
  email: 'vera@carshes.by',
  password: 'password123',
  confirmPassword: 'password123',
}

const errorsOf = (schema, values) => {
  const result = schema.safeParse(values)
  return result.success ? {} : result.error.flatten().fieldErrors
}

describe('signInSchema', () => {
  it('accepts valid credentials and defaults remember to false', () => {
    expect(signInSchema.parse({ email: ' a@b.co ', password: 'x' })).toEqual({
      email: 'a@b.co',
      password: 'x',
      remember: false,
    })
  })

  it.each([
    [{ password: 'x' }, 'email', 'Email is required'],
    [{ email: 'not-an-email', password: 'x' }, 'email', 'Enter a valid email'],
    [{ email: 'a@b.co', password: '' }, 'password', 'Password is required'],
    [{ email: 'a@b.co', password: 'я'.repeat(37) }, 'password', 'Password cannot exceed 72 bytes'],
  ])('rejects %j', (values, field, message) => {
    expect(errorsOf(signInSchema, values)[field]).toContain(message)
  })
})

describe('registerSchema', () => {
  it('trims and upper-cases the licence number', () => {
    expect(registerSchema.parse(VALID_PROFILE).licenseNumber).toBe('MP1234567')
  })

  it.each([
    [{ firstName: 'V' }, 'firstName', 'First name must be at least 2 characters long'],
    [{ lastName: 'x'.repeat(51) }, 'lastName', 'Last name cannot exceed 50 characters'],
    [
      { licenseNumber: 'ab12' },
      'licenseNumber',
      'Licence number must be at least 6 characters long',
    ],
    [
      { licenseNumber: 'A'.repeat(21) },
      'licenseNumber',
      'Licence number cannot exceed 20 characters',
    ],
    [{ email: `${'a'.repeat(250)}@b.co` }, 'email', 'Email cannot exceed 254 characters'],
    [
      { password: 'short', confirmPassword: 'short' },
      'password',
      'Password must be at least 8 characters',
    ],
    [{ confirmPassword: 'different1' }, 'confirmPassword', 'Passwords do not match'],
  ])('rejects %j', (override, field, message) => {
    expect(errorsOf(registerSchema, { ...VALID_PROFILE, ...override })[field]).toContain(message)
  })
})

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
