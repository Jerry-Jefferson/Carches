// Connects the shared axios instance to the session. Imported once from main.js for its
// side effect: the interceptors register when the app boots.
//
// The static store / router imports are safe: nothing imports this file except main.js,
// so it closes no cycle (http.js ← services/* ← store; router → store).

import { ROUTES } from '@/router/routes.constants'
import router from '@/router'
import store from '@/store'
import notify from '@/utils/notify'
import http, { PUBLIC_AUTH_PATHS, normalizeError, serverNow } from './http'
import { tokenExpiresAt } from './tokenStorage'

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

const isPublicAuthRequest = (config) =>
  PUBLIC_AUTH_PATHS.some((path) => config?.url?.endsWith(path))

// Sends the current JWT as `Authorization: Bearer <token>`, and notes on the config which
// token the request carried (see expireSession)
export const attachToken = (config) => {
  const { token } = store.state.auth
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.sentToken = token
  return config
}

// Clears the session and goes to the sign-in page, keeping the current page in ?redirect=.
// Acts only while `token` is still the session's token. That skips the other requests
// failing at the same time (the first one already cleared it) and a slow request sent with
// an old token that answers after the user signed in again.
const expireSession = async (token) => {
  if (!token || token !== store.state.auth.token) return
  await store.dispatch('auth/clearSession')
  notify.warning(SESSION_EXPIRED_MESSAGE)

  const current = router.currentRoute.value
  if (current.meta.guestOnly) return
  await router.replace({ name: ROUTES.AUTH.NAME, query: { redirect: current.fullPath } })
}

// Every failed request rejects with `statusCode` and the backend `message` on the error.
// A 401 from any request except sign-in / sign-up (or one sent with
// `{ skipAuthRedirect: true }`) means the token expired, was revoked or its user was deleted.
export const handleResponseError = async (error) => {
  normalizeError(error)
  const { config } = error
  if (error.statusCode === 401 && !isPublicAuthRequest(config) && !config?.skipAuthRedirect) {
    // Not awaited: the caller gets the 401 at once. A failed redirect (e.g. the sign-in
    // page chunk does not load) must not become an unhandled rejection.
    expireSession(config.sentToken).catch(() => {})
  }
  return Promise.reject(error)
}

// ── Expiry ──────────────────────────────────────────────────────────────────────────
// Ends the session when its token expires, not at the next failed request. `exp` is
// server time, so it is compared with serverNow().

const SESSION_MUTATIONS = ['auth/SET_SESSION', 'auth/SET_TOKEN', 'auth/CLEAR_SESSION']
// setTimeout fires at once for longer delays, so long waits are done in steps
const MAX_TIMEOUT = 2 ** 31 - 1
let expiryTimer = null

export const scheduleExpiry = () => {
  clearTimeout(expiryTimer)
  const { token } = store.state.auth
  const expiresAt = token ? tokenExpiresAt(token) : null
  if (expiresAt === null) return
  const delay = Math.max(0, expiresAt - serverNow().getTime())
  expiryTimer = setTimeout(
    () => (delay > MAX_TIMEOUT ? scheduleExpiry() : expireSession(token).catch(() => {})),
    Math.min(delay, MAX_TIMEOUT),
  )
}

http.interceptors.request.use(attachToken)
http.interceptors.response.use((response) => response, handleResponseError)
store.subscribe(({ type }) => SESSION_MUTATIONS.includes(type) && scheduleExpiry())
