import http, { unwrap } from './http'

// E9, E10 (user)
export const list = () => http.get('/cars').then(unwrap)

export const getById = (id) => http.get(`/cars/${id}`).then(unwrap)

// E11–E17 (admin). Update and delete are keyed by VIN, not by id.
export const create = (car) => http.post('/cars', car).then(unwrap)

export const update = (vin, changes) =>
  http.put(`/cars/${encodeURIComponent(vin)}`, changes).then(unwrap)

export const remove = (vin) => http.delete(`/cars/${encodeURIComponent(vin)}`)

export const listInUseLowFuel = () => http.get('/cars/in-use/low-fuel').then(unwrap)

export const listReserved = (authorized) =>
  http.get('/cars/reserved', { params: { authorized: String(Boolean(authorized)) } }).then(unwrap)

// Both return a Mongo update result: { acknowledged, matchedCount, modifiedCount, … }
export const sendOldOrWornToService = () =>
  http.put('/cars/service-old-or-high-mileage').then(unwrap)

export const relocateFrequentlyBooked = () =>
  http.put('/cars/relocate-frequently-booked').then(unwrap)
