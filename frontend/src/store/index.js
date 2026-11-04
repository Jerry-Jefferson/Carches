import { createStore } from 'vuex'

import admin from '@/store/modules/admin'
import auth from '@/store/modules/auth'
import bookings from '@/store/modules/bookings'
import carDetails from '@/store/modules/carDetails'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'

// Drops per-user data and admin filters when the session ends (logout, expired token)
export const resetOnSignOut = (store) => {
  store.subscribe((mutation) => {
    if (mutation.type !== 'auth/CLEAR_SESSION') return
    store.commit('bookings/RESET')
    // Test stores may be built without the admin modules
    if (!store.hasModule('admin')) return
    store.commit('admin/fleet/RESET')
    store.commit('admin/insights/RESET')
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
