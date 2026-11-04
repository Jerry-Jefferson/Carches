// User roles and the names shown for a user.

// Mirrors USER_ROLES in backend/src/constants/user.js
export const ROLE = Object.freeze({ USER: 'user', ADMIN: 'admin' })

export const fullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''

export const initials = (user) => {
  const fromName = [user?.firstName, user?.lastName]
    .map((part) => part?.trim()?.[0])
    .filter(Boolean)
    .join('')
  const value = fromName || user?.email?.trim()?.[0] || '?'
  return value.toUpperCase()
}
