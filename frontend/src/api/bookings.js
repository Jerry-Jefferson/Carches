import http, { unwrap } from './http'

// E18 — the caller's bookings, taken from the token
export const listMine = () => http.get('/bookings/my').then(unwrap)

// E21 — for non-admins the backend replaces `userId` with the caller
export const create = (booking) => http.post('/bookings', booking).then(unwrap)

// E19, E20, E22, E23 (admin)
export const list = () => http.get('/bookings').then(unwrap)

export const getById = (id) => http.get(`/bookings/${id}`).then(unwrap)

export const update = (id, changes) => http.put(`/bookings/${id}`, changes).then(unwrap)

export const remove = (id) => http.delete(`/bookings/${id}`)
