import { createStore } from 'vuex'

import admin from './modules/admin'
import auth from './modules/auth'
import bookings from './modules/bookings'
import carDetails from './modules/carDetails'
import cars from './modules/cars'
import geo from './modules/geo'

// Drops per-user data when the session ends (logout, expired token)
export const resetOnSignOut = (store) => {
  store.subscribe((mutation) => {
    if (mutation.type !== 'auth/CLEAR_SESSION') return
    store.commit('bookings/RESET')
    // Test stores may be built without the admin modules
    if (!store.hasModule('admin')) return
    store.commit('admin/fleet/RESET')
    store.commit('admin/trips/RESET')
    store.commit('admin/users/RESET')
  })
}

export default createStore({
  strict: import.meta.env.DEV,
  modules: {
    admin,
    auth,
    bookings,
    carDetails,
    cars,
    geo,
  },
  plugins: [resetOnSignOut],
})
