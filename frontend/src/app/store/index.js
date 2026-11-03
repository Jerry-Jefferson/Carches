import { createStore } from 'vuex'

import admin from '@/features/admin/store'
import auth from '@/features/auth/store/auth'
import bookings from '@/features/bookings/store/bookings'
import carDetails from '@/features/cars/store/carDetails'
import cars from '@/features/cars/store/cars'
import geo from '@/shared/store/geo'

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
