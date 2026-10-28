// Where the JWT lives between page loads. "Remember me" keeps it in localStorage
// (survives the browser closing); otherwise sessionStorage (this tab only).

const KEY = 'carshes.token'

// Storage can throw (private mode, blocked site data) — treat that as "nothing stored"
const safely = (fn, fallback = null) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const saveToken = (token, { remember = false } = {}) => {
  clearToken()
  safely(() => (remember ? localStorage : sessionStorage).setItem(KEY, token))
}

// Returns { token, remember } or null
export const loadToken = () => {
  const remembered = safely(() => localStorage.getItem(KEY))
  if (remembered) return { token: remembered, remember: true }
  const session = safely(() => sessionStorage.getItem(KEY))
  return session ? { token: session, remember: false } : null
}

export const clearToken = () => {
  safely(() => localStorage.removeItem(KEY))
  safely(() => sessionStorage.removeItem(KEY))
}
