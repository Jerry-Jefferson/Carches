import axios from 'axios'

export const NETWORK_ERROR_MESSAGE = 'Network error. Check your connection.'

// Requests that must never trigger the "session expired" redirect: signing in or up
// with wrong credentials also answers 401.
const PUBLIC_AUTH_PATHS = ['/auth/signin', '/auth/signup']

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v2',
  headers: { 'Content-Type': 'application/json' },
})

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

/**
 * Wires the instance to the session. Called once from main.js; kept separate so
 * http.js does not import the store (the store's API modules import http.js).
 *
 * - getToken(): current JWT or null — sent as `Authorization: Bearer <token>`
 * - onUnauthorized(error): called on a 401 from any request except sign in / sign up,
 *   unless the request was made with `{ skipAuthRedirect: true }`
 */
export const installInterceptors = (instance, { getToken, onUnauthorized }) => {
  const requestId = instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  const responseId = instance.interceptors.response.use(
    (response) => response,
    (error) => {
      normalizeError(error)
      const { config } = error
      const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => config?.url?.endsWith(path))
      if (error.statusCode === 401 && !isPublicAuth && !config?.skipAuthRedirect) {
        onUnauthorized(error)
      }
      return Promise.reject(error)
    },
  )

  return () => {
    instance.interceptors.request.eject(requestId)
    instance.interceptors.response.eject(responseId)
  }
}

export default http
