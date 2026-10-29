import fleet from './fleet'
import insights from './insights'
import trips from './trips'
import users from './users'

// Admin console: admin/fleet, admin/users, admin/trips, admin/insights.
// Only dispatched from /admin, so non-admins never call admin endpoints.
export default {
  namespaced: true,
  modules: { fleet, insights, trips, users },
  actions: {
    // Everything the console shows: E9, E5, E19 in parallel, then the E14 / E15 widgets.
    // Resolves with the first failure message, or null.
    async loadAll({ dispatch }) {
      const results = await Promise.allSettled([
        dispatch('cars/fetchCars', { force: true }, { root: true }),
        dispatch('users/fetchUsers'),
        dispatch('trips/fetchTrips'),
      ])
      await dispatch('fleet/fetchWidgets')
      dispatch('insights/tick')
      return results.find((result) => result.status === 'rejected')?.reason?.message ?? null
    },
  },
}
