import { describe, it, expect } from 'vitest'

import { signInSchema } from '@/components/auth/SignInForm.vue'
import { signUpSchema } from '@/components/auth/SignUpForm.vue'
import { userSchema } from '@/components/admin/UserFormModal.vue'

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

describe('signUpSchema', () => {
  it('trims and upper-cases the licence number', () => {
    expect(signUpSchema.parse(VALID_PROFILE).licenseNumber).toBe('MP1234567')
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
    expect(errorsOf(signUpSchema, { ...VALID_PROFILE, ...override })[field]).toContain(message)
  })
  it('reports mismatching passwords while other fields are still invalid (L20)', () => {
    // An untouched field is undefined: a type error, which stops a whole-form refine
    const errors = errorsOf(signUpSchema, {
      ...VALID_PROFILE,
      firstName: undefined,
      confirmPassword: 'different1',
    })
    expect(errors.firstName).toContain('First name is required')
    expect(errors.confirmPassword).toContain('Passwords do not match')
  })

  it('reports a missing password once, with its own message', () => {
    const { password } = errorsOf(signUpSchema, { ...VALID_PROFILE, password: undefined })
    expect(password[0]).toBe('Password is required')
  })
})

describe('userSchema (UserFormModal) and signUpSchema', () => {
  const PROFILE_FIELDS = ['firstName', 'lastName', 'email', 'licenseNumber']
  const PROBES = [
    undefined,
    '',
    ' ',
    'V',
    'Vera',
    ' mp1234567 ',
    'ab12',
    'ßßßßß',
    'A'.repeat(21),
    'x'.repeat(51),
    'not-an-email',
    `${'a'.repeat(250)}@b.co`,
  ]

  it.each(PROFILE_FIELDS.flatMap((field) => PROBES.map((value) => [field, value])))(
    'give %s = %j the same result',
    (field, value) => {
      const profile = { ...VALID_PROFILE, [field]: value }
      const signUp = signUpSchema.safeParse(profile)
      const user = userSchema.safeParse(profile)
      expect(user.success).toBe(signUp.success)
      if (signUp.success) expect(user.data[field]).toEqual(signUp.data[field])
      else
        expect(errorsOf(userSchema, profile)[field]).toEqual(errorsOf(signUpSchema, profile)[field])
    },
  )
})
