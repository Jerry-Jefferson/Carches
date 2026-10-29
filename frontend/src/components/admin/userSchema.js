// Zod 3 schema for the admin user form (E7). Same rules as sign-up
// (components/auth/schemas.js), without the password fields.

import { z } from 'zod'

import { getErrorMessage } from '@/api/http'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const personName = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .min(2, `${label} must be at least 2 characters long`)
    .max(50, `${label} cannot exceed 50 characters`)

export const userSchema = z.object({
  firstName: personName('First name'),
  lastName: personName('Last name'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, 'Email is required')
    .max(254, 'Email cannot exceed 254 characters')
    .regex(EMAIL_REGEX, 'Enter a valid email'),
  licenseNumber: z
    .string({ required_error: 'Licence number is required' })
    .trim()
    .toUpperCase()
    .min(1, 'Licence number is required')
    .min(6, 'Licence number must be at least 6 characters long')
    .max(20, 'Licence number cannot exceed 20 characters'),
})

const DUPLICATE = /^Duplicate field value entered: (.+)\. Please use another value/i

/**
 * Where to show a failed PUT /users/:id. `values` are the submitted values, used to
 * place "Duplicate field value entered: X" on the field holding X.
 * Returns { field, message } — `field` is null for a form-level alert.
 */
export const mapUserError = (error, values = {}) => {
  const message = getErrorMessage(error)
  if (/email already exists/i.test(message)) return { field: 'email', message }
  if (/license number already exists/i.test(message)) return { field: 'licenseNumber', message }

  const duplicate = message.match(DUPLICATE)?.[1]?.trim().toLowerCase()
  if (duplicate) {
    if (duplicate === values.email?.trim().toLowerCase()) {
      return { field: 'email', message: 'A user with this email already exists' }
    }
    if (duplicate === values.licenseNumber?.trim().toLowerCase()) {
      return { field: 'licenseNumber', message: 'A user with this license number already exists' }
    }
  }
  return { field: null, message }
}
