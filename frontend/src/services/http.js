// The shared axios instance and its pure helpers. The session wiring (Bearer token,
// 401 → sign-in page) lives in interceptors.js, imported once from main.js, so this file
// never imports the store or the router (the store's API wrappers import it).

import axios from 'axios'

export const NETWORK_ERROR_MESSAGE = 'Network error. Check your connection.'

// Requests that must never trigger the "session expired" redirect: signing in or up
// with wrong credentials also answers 401.
export const PUBLIC_AUTH_PATHS = ['/auth/signin', '/auth/signup']

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v2',
  headers: { 'Content-Type': 'application/json' },
})

// Server clock minus browser clock, from the `Date` header of the last response. The
// header has whole seconds, so serverNow() is never ahead of the server.
let serverClockOffset = 0

export const trackServerClock = (response) => {
  const serverTime = Date.parse(response?.headers?.date ?? '')
  if (!Number.isNaN(serverTime)) serverClockOffset = serverTime - Date.now()
  return response
}

// "Now" as the backend sees it (it decides whether a booking has started); the browser
// clock until a response with a `Date` header has arrived
export const serverNow = () => new Date(Date.now() + serverClockOffset)

http.interceptors.response.use(trackServerClock)

// Backend envelope is { message, data }; 204 responses have no body
export const unwrap = (response) => response.data?.data

// Adds `statusCode` and the backend `message` to an axios error, in place.
// `error.response` stays available.
export const normalizeError = (error) => {
  if (axios.isCancel(error)) return error
  const body = error.response?.data
  error.statusCode = body?.statusCode ?? error.response?.status ?? null
  error.message = (typeof body?.message === 'string' && body.message) || NETWORK_ERROR_MESSAGE
  return error
}

export const getErrorMessage = (error, fallback = NETWORK_ERROR_MESSAGE) =>
  error?.message || fallback

export default http
