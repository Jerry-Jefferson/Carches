import * as bookingsApi from '@/shared/api/bookings'
import { getErrorMessage } from '@/shared/api/http'
import { CAR_STATUS } from '@/shared/utils/derive'
import { DEFAULT_TRIP_FILTERS, refId } from '@/features/admin/utils/admin'

export const CAR_UPDATE_FAILED = 'car_update_failed'

// The booking was saved but the follow-up car update (Q7, Q8) failed. The error keeps
// what is needed for "Retry car update".
const carUpdateFailed = (err, { vin, changes, booking = null }) =>
  Object.assign(err, { code: CAR_UPDATE_FAILED, vin, changes, booking })

// PUT /cars/:vin answers 404 for a car that has been deleted (soft delete): there is
// nothing left to update, and a retry would fail the same way
const isCarGone = (err) => err?.statusCode === 404

// Follow-up car update of a saved booking change
const updateCarAfter = async (dispatch, { vin, changes, booking = null }) => {
  try {
    await dispatch('admin/fleet/updateCar', { vin, changes }, { root: true })
  } catch (err) {
    if (isCarGone(err)) return
    throw carUpdateFailed(err, { vin, changes, booking })
  }
}

// The populated car of a booking has the VIN that PUT /cars/:vin needs
const vinOf = (trip) => (trip?.carId && typeof trip.carId === 'object' ? trip.carId.vin : null)

// Counts the fetchTrips calls
let tripsSeq = 0
// The newest call whose response has been committed
let tripsCommitted = 0

// Trips & bookings (E19–E23)
export default {
  namespaced: true,
  state: () => ({
    items: [],
    filters: { ...DEFAULT_TRIP_FILTERS },
    isLoading: false,
    isMutating: false,
    error: null,
    loadedAt: null,
  }),
  getters: {
    // Plain state fields, read by components through mapGetters
    items: (state) => state.items,
    filters: (state) => state.filters,
    isLoading: (state) => state.isLoading,
    error: (state) => state.error,

    byId: (state) => (id) => state.items.find((trip) => trip._id === id) ?? null,
    // { [carId]: bookings, newest first }
    tripsByCar: (state) => {
      const groups = {}
      for (const trip of state.items) {
        const id = refId(trip.carId)
        if (id) (groups[id] ??= []).push(trip)
      }
      for (const list of Object.values(groups)) {
        list.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      }
      return groups
    },
    tripsByUser: (state) => {
      const groups = {}
      for (const trip of state.items) {
        const id = refId(trip.userId)
        if (id) (groups[id] ??= []).push(trip)
      }
      return groups
    },
  },
  mutations: {
    RESET(state) {
      state.items = []
      state.filters = { ...DEFAULT_TRIP_FILTERS }
      state.error = null
      state.loadedAt = null
    },
    SET_ITEMS(state, items) {
      state.items = items
      state.loadedAt = Date.now()
    },
    UPSERT(state, trip) {
      const exists = state.items.some((item) => item._id === trip._id)
      state.items = exists
        ? state.items.map((item) => (item._id === trip._id ? trip : item))
        : [trip, ...state.items]
    },
    REMOVE(state, id) {
      state.items = state.items.filter((item) => item._id !== id)
    },
    SET_FILTERS(state, filters) {
      state.filters = { ...DEFAULT_TRIP_FILTERS, ...filters }
    },
    SET_LOADING(state, isLoading) {
      state.isLoading = isLoading
    },
    SET_MUTATING(state, isMutating) {
      state.isMutating = isMutating
    },
    SET_ERROR(state, error) {
      state.error = error
    },
  },
  actions: {
    // E19, newest start first
    async fetchTrips({ state, commit, rootState }) {
      // A response that arrives after sign-out is dropped (the next user must not see it)
      const token = rootState.auth?.token
      const isSameSession = () => rootState.auth?.token === token
      // An overlapping refresh can answer out of order: never replace newer data
      const seq = ++tripsSeq
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      try {
        const trips = ((await bookingsApi.list()) ?? []).toSorted(
          (a, b) => new Date(b.startDate) - new Date(a.startDate),
        )
        if (!isSameSession()) return []
        if (seq < tripsCommitted) return state.items
        tripsCommitted = seq
        commit('SET_ITEMS', trips)
        return trips
      } catch (err) {
        if (isSameSession() && seq > tripsCommitted) commit('SET_ERROR', getErrorMessage(err))
        throw err
      } finally {
        if (seq === tripsSeq) commit('SET_LOADING', false)
      }
    },

    // E20, for the details drawer
    async fetchTrip({ commit }, id) {
      const trip = await bookingsApi.getById(id)
      commit('UPSERT', trip)
      return trip
    },

    async mutate({ commit }, request) {
      commit('SET_MUTATING', true)
      try {
        return await request()
      } finally {
        commit('SET_MUTATING', false)
      }
    },

    // The booking changed the car's status (backend rule), so the fleet is reloaded
    refreshCars({ dispatch }) {
      return dispatch('cars/fetchCars', { force: true }, { root: true }).catch(() => {})
    },

    // E21 with `userId`. The response is not populated, so the list is reloaded. The
    // booking is saved at this point: a failed reload is kept in `error` for the list, not
    // thrown, or the form would show a failure and invite a duplicate booking.
    async createTrip({ dispatch }, booking) {
      const created = await dispatch('mutate', () => bookingsApi.create(booking))
      await Promise.all([dispatch('fetchTrips').catch(() => {}), dispatch('refreshCars')])
      return created
    },

    // E22 (populated response)
    async updateTrip({ commit, dispatch }, { id, changes }) {
      const trip = await dispatch('mutate', () => bookingsApi.update(id, changes))
      commit('UPSERT', trip)
      await dispatch('refreshCars')
      return trip
    },

    // E22, then E12 (Q7): ending the booking frees the car, but its fuel, mileage and
    // location must be updated separately. A failed second step throws CAR_UPDATE_FAILED.
    async completeTrip(
      { dispatch },
      { trip, endDate, finishFuelLevel, finishMileage, location = null },
    ) {
      const booking = await dispatch('updateTrip', {
        id: trip._id,
        changes: { endDate, finishFuelLevel, finishMileage },
      })
      const vin = vinOf(booking) ?? vinOf(trip)
      if (!vin) return booking

      const changes = { fuelLevel: finishFuelLevel, mileage: finishMileage }
      if (location) changes.location = location
      await updateCarAfter(dispatch, { vin, changes, booking })
      return booking
    },

    // A car deleted meanwhile counts as done (404, see isCarGone)
    async retryCarUpdate({ dispatch }, { vin, changes }) {
      try {
        await dispatch('admin/fleet/updateCar', { vin, changes }, { root: true })
      } catch (err) {
        if (!isCarGone(err)) throw err
      }
    },

    // E23, then optionally E12 to free the car: deleting keeps the car's status (Q8)
    async deleteTrip({ commit, dispatch }, { trip, freeCar = false }) {
      await dispatch('mutate', () => bookingsApi.remove(trip._id))
      commit('REMOVE', trip._id)

      const vin = vinOf(trip)
      if (!freeCar || !vin) return
      await updateCarAfter(dispatch, { vin, changes: { status: CAR_STATUS.FREE } })
    },

    setFilters({ state, commit }, partial) {
      commit('SET_FILTERS', { ...state.filters, ...partial })
    },
  },
}
