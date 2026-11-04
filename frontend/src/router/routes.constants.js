// Every route of the app: its path (used only by the route table in router/index.js) and
// its name (used by every navigation — navigate by name, never by path).
// tests/unit/router/routes.spec.js keeps this map and the route table in sync.

const deepFreeze = (object) => {
  Object.values(object).forEach((value) => {
    if (value && typeof value === 'object') deepFreeze(value)
  })
  return Object.freeze(object)
}

export const ROUTES = deepFreeze({
  HOME: {
    PATH: '/',
    NAME: 'home',
  },
  AUTH: {
    PATH: '/auth',
    NAME: 'auth',
  },
  FLEET: {
    PATH: '/fleet',
    NAME: 'fleet',
  },
  CAR_DETAILS: {
    PATH: '/cars/:id',
    NAME: 'car-details',
  },
  MY_TRIPS: {
    PATH: '/trips',
    NAME: 'my-trips',
  },
  MY_PROFILE: {
    PATH: '/profile',
    NAME: 'my-profile',
  },
  ADMIN: {
    PATH: '/admin',
    NAME: 'admin',
  },
  NOT_FOUND: {
    PATH: '/:pathMatch(.*)*',
    NAME: 'not-found',
  },
})

// Values of the `tab` query parameter, per page: /admin?tab=fleet|trips|users
export const TAB_NAMES = deepFreeze({
  ADMIN: {
    FLEET: 'fleet',
    TRIPS: 'trips',
    USERS: 'users',
  },
})
