// Where the JWT lives between page loads. The browser keeps one stored session: "Remember
// me" puts it in localStorage (shared by every tab, survives the browser closing), otherwise
// sessionStorage (this tab only).
//
// - A new sign-in replaces whatever was stored, so the next person on a shared computer
//   never inherits the previous user's remembered session.
// - A tab's own sessionStorage token wins over the remembered one.
// - A token is removed from localStorage only by the session that owns it, so one tab's
//   expired session never wipes another tab's newer sign-in.
// - Expired tokens are never handed out (and are dropped from storage).

const KEY = 'carshes.token'

// Storage can throw (private mode, blocked site data) — treat that as "nothing stored"
const safely = (fn, fallback = null) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/**
 * When the token expires, in ms, read from its `exp` claim; null when it cannot be read.
 * Only decodes the payload — the backend still verifies every token.
 */
export const tokenExpiresAt = (token) => {
  const payload = safely(() =>
    JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))),
  )
  return Number.isFinite(payload?.exp) ? payload.exp * 1000 : null
}

// A token without a readable `exp` is left to the backend to judge
const isExpired = (token, now) => (tokenExpiresAt(token) ?? Infinity) <= now

export const clearToken = (token) => {
  safely(() => sessionStorage.getItem(KEY) === token && sessionStorage.removeItem(KEY))
  safely(() => localStorage.getItem(KEY) === token && localStorage.removeItem(KEY))
}

export const saveToken = (token, { remember = false } = {}) => {
  safely(() => sessionStorage.removeItem(KEY))
  safely(() => localStorage.removeItem(KEY))
  safely(() => (remember ? localStorage : sessionStorage).setItem(KEY, token))
}

// This tab's token, else the remembered one; expired ones are dropped on the way
export const loadToken = (now = Date.now()) => {
  // Getters: even reading `window.localStorage` can throw when site data is blocked
  for (const storage of [() => sessionStorage, () => localStorage]) {
    const token = safely(() => storage().getItem(KEY))
    if (!token) continue
    if (!isExpired(token, now)) return token
    clearToken(token)
  }
  return null
}
