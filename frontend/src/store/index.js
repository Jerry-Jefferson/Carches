import { createStore } from 'vuex'

import auth from './modules/auth'
import bookings from './modules/bookings'
import cars from './modules/cars'
import geo from './modules/geo'

// Drops per-user data when the session ends (logout, expired token)
export const resetOnSignOut = (store) => {
  store.subscribe((mutation) => {
    if (mutation.type === 'auth/CLEAR_SESSION') store.commit('bookings/RESET')
  })
}

export default createStore({
  strict: import.meta.env.DEV,
  modules: {
    auth,
    bookings,
    cars,
    geo,
  },
  plugins: [resetOnSignOut],
})
