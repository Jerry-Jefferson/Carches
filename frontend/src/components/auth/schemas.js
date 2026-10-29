// Zod 3 schemas for the auth forms. The rules mirror the backend
// (middleware/validateAuthBody.js and models/user.model.js), so most mistakes are
// caught before the request; mapAuthError() places the rest on the right field.

import { z } from 'zod'

import { getErrorMessage } from '@/api/http'

// Same pattern as EMAIL_REGEX in the user model
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_BYTES = 72

const byteLength = (value) => new TextEncoder().encode(value).length

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email cannot exceed 254 characters')
  .regex(EMAIL_REGEX, 'Enter a valid email')

// bcrypt reads only the first 72 bytes, so the backend rejects longer passwords
const passwordBytes = (schema) =>
  schema.refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, {
    message: `Password cannot exceed ${PASSWORD_MAX_BYTES} bytes`,
  })

const personName = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .min(2, `${label} must be at least 2 characters long`)
    .max(50, `${label} cannot exceed 50 characters`)

export const signInSchema = z.object({
  email,
  password: passwordBytes(
    z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  ),
  remember: z.boolean().default(false),
})

export const registerSchema = z
  .object({
    firstName: personName('First name'),
    lastName: personName('Last name'),
    licenseNumber: z
      .string({ required_error: 'Licence number is required' })
      .trim()
      .toUpperCase()
      .min(1, 'Licence number is required')
      .min(6, 'Licence number must be at least 6 characters long')
      .max(20, 'Licence number cannot exceed 20 characters'),
    email,
    password: passwordBytes(
      z
        .string({ required_error: 'Password is required' })
        .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    ),
    confirmPassword: z.string({ required_error: 'Confirm your password' }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Known backend messages that belong to a single field (section 6.4 of the plan)
const FIELD_ERRORS = [
  { pattern: /email already exists/i, field: 'email' },
  { pattern: /license number already exists/i, field: 'licenseNumber' },
  { pattern: /^email is invalid/i, field: 'email' },
  { pattern: /^password (must be at least|cannot exceed)/i, field: 'password' },
]

/**
 * Where to show a failed sign-in / sign-up request.
 * Returns { field, message } — `field` is a form field name, or null for a form-level alert
 * (wrong credentials, network errors, anything unrecognised).
 */
export const mapAuthError = (error) => {
  const message = getErrorMessage(error)
  const match = FIELD_ERRORS.find(({ pattern }) => pattern.test(message))
  return { field: match?.field ?? null, message }
}
