import http, { unwrap } from './http'

// E4 — the user comes from the token, never from a parameter
export const getMe = (config) => http.get('/users/me', config).then(unwrap)

// E5–E8 (admin)
export const list = () => http.get('/users').then(unwrap)

export const getById = (id) => http.get(`/users/${id}`).then(unwrap)

// The backend ignores `password` and `role` here
export const update = (id, { email, firstName, lastName, licenseNumber }) =>
  http.put(`/users/${id}`, { email, firstName, lastName, licenseNumber }).then(unwrap)

export const remove = (id) => http.delete(`/users/${id}`)
