import http, { unwrap } from './http'

// E1 — only the fields the backend expects are sent
export const signUp = ({ email, password, firstName, lastName, licenseNumber }) =>
  http.post('/auth/signup', { email, password, firstName, lastName, licenseNumber }).then(unwrap)

// E2 → { user, token }
export const signIn = ({ email, password }) =>
  http.post('/auth/signin', { email, password }).then(unwrap)

// E3 — the session is cleared locally whatever the result, so no 401 redirect
export const logout = () => http.post('/auth/logout', null, { skipAuthRedirect: true })
