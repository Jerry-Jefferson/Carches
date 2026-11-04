// Where to show a failed form request: each mapper returns { field, message }, where
// `field` is the form field the backend message belongs to, or null for a form-level alert.
// The forms' Zod schemas live in the form components themselves.

import { getErrorMessage } from '@/services/http'

// Known backend messages that belong to a single field of the auth forms
const AUTH_FIELD_ERRORS = [
  { pattern: /email already exists/i, field: 'email' },
  { pattern: /license number already exists/i, field: 'licenseNumber' },
  { pattern: /^email is invalid/i, field: 'email' },
  { pattern: /^password (must be at least|cannot exceed)/i, field: 'password' },
]

/**
 * A failed sign-in / sign-up request (SignInForm, SignUpForm). Wrong credentials, network
 * errors and anything unrecognised go to the form-level alert.
 */
export const mapAuthError = (error) => {
  const message = getErrorMessage(error)
  const match = AUTH_FIELD_ERRORS.find(({ pattern }) => pattern.test(message))
  return { field: match?.field ?? null, message }
}

const USER_DUPLICATE = /^Duplicate field value entered: (.+)\. Please use another value/i

/**
 * A failed PUT /users/:id (UserFormModal). `values` are the submitted values, used to
 * place "Duplicate field value entered: X" on the field holding X.
 */
export const mapUserError = (error, values = {}) => {
  const message = getErrorMessage(error)
  if (/email already exists/i.test(message)) return { field: 'email', message }
  if (/license number already exists/i.test(message)) return { field: 'licenseNumber', message }

  const duplicate = message.match(USER_DUPLICATE)?.[1]?.trim().toLowerCase()
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

const VEHICLE_DUPLICATE = /^Duplicate field value entered: (.*)\. Please use another value/i

/**
 * A failed vehicle save (VehicleFormModal): duplicate VIN / plate errors go on their field.
 */
export const mapVehicleError = (error, values = {}) => {
  const message = getErrorMessage(error)
  const duplicate = message.match(VEHICLE_DUPLICATE)?.[1]?.trim().toUpperCase()
  if (duplicate) {
    if (duplicate === String(values.vin ?? '').toUpperCase()) {
      return { field: 'vin', message: 'A car with this VIN already exists' }
    }
    if (duplicate === String(values.registrationNumber ?? '').toUpperCase()) {
      return {
        field: 'registrationNumber',
        message: 'A car with this registration number already exists',
      }
    }
  }
  return { field: null, message }
}
