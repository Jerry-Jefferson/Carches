import { dayStats, tripsStartedPerDay, userStats, utilisation } from '@/utils/admin/consoleStats'
import { BOOKING_STATUS, bookingStatus } from '@/utils/bookings/bookingStatus'
import { countCarsByStatus } from '@/utils/cars/carStatus'
import { minskDayKey } from '@/utils/format/dateTime'

// KPIs of the console, derived from the loaded lists. `date` (a minskDayKey) drives the
// trip KPIs and the "selected date only" trip filter.
export default {
  namespaced: true,
  state: () => ({
    date: minskDayKey(Date.now()),
    // Ticked by the console so time-based values (active trips, durations) stay current
    now: Date.now(),
  }),
  getters: {
    // Plain state fields, read by components through mapGetters
    date: (state) => state.date,
    now: (state) => state.now,

    kpis: (state, getters, rootState) => {
      const cars = rootState.cars.items
      const trips = rootState.admin.trips.items
      const users = rootState.admin.users.items
      const active = trips.filter(
        (trip) => bookingStatus(trip, state.now) === BOOKING_STATUS.ACTIVE,
      ).length
      return {
        fleet: { total: cars.length, byStatus: countCarsByStatus(cars) },
        rentals: { active, utilisation: utilisation(cars) },
        day: dayStats(trips, state.date, state.now),
        users: userStats(users, state.now),
      }
    },
    sparkline: (state, getters, rootState) =>
      tripsStartedPerDay(rootState.admin.trips.items, { now: state.now }),
    isToday: (state) => state.date === minskDayKey(state.now),
  },
  mutations: {
    // On sign-out: the next admin starts on today
    RESET(state) {
      state.now = Date.now()
      state.date = minskDayKey(state.now)
    },
    SET_DATE(state, date) {
      state.date = date
    },
    TICK(state, now) {
      state.now = now
    },
  },
  actions: {
    setDate({ commit }, date) {
      commit('SET_DATE', date || minskDayKey(Date.now()))
    },
    // While "today" is selected, the date follows the clock past midnight
    tick({ state, commit }) {
      const wasToday = state.date === minskDayKey(state.now)
      const now = Date.now()
      commit('TICK', now)
      if (wasToday) commit('SET_DATE', minskDayKey(now))
    },
  },
}
