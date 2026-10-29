import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import { getErrorMessage } from '@/api/http'
import { BOOKING_STATUS, CAR_STATUS, bookingStatus } from '@/utils/derive'

export const CACHE_MS = 60000

export const BOOKING_BLOCK = Object.freeze({
  CAR_UNAVAILABLE: 'car_unavailable',
  OPEN_BOOKING: 'open_booking',
})

const BLOCK_MESSAGES = {
  [BOOKING_BLOCK.CAR_UNAVAILABLE]: 'This car is no longer available.',
  [BOOKING_BLOCK.OPEN_BOOKING]: 'You already have an active trip.',
}

// Thrown before POST /bookings when a pre-check fails; `code` is a BOOKING_BLOCK value
export const bookingBlockedError = (code) =>
  Object.assign(new Error(BLOCK_MESSAGES[code]), { code })

const byStatus = (status) => (state) =>
  state.mine.filter((booking) => bookingStatus(booking) === status)

export default {
  namespaced: true,
  state: () => ({
    mine: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    loadedAt: null,
  }),
  getters: {
    activeTrips: byStatus(BOOKING_STATUS.ACTIVE),
    upcoming: byStatus(BOOKING_STATUS.UPCOMING),
    completed: byStatus(BOOKING_STATUS.COMPLETED),
    // An active or upcoming booking blocks new bookings (Q2)
    openBooking: (state, getters) => getters.activeTrips[0] ?? getters.upcoming[0] ?? null,
    // Bookings joined with the fleet list: E18 populates `carId` without brand and model
    // (Q5). `car` is null when the car has left the fleet; `plate` comes from either source.
    trips: (state, getters, rootState, rootGetters) =>
      state.mine.map((booking) => {
        const ref = booking.carId
        const carId = ref && typeof ref === 'object' ? ref._id : ref
        const car = carId ? rootGetters['cars/byId'](carId) : null
        return {
          booking,
          carId: carId ?? null,
          car,
          plate: car?.registrationNumber ?? ref?.registrationNumber ?? '',
        }
      }),
  },
  mutations: {
    // On sign-out, so the next user never sees these bookings
    RESET(state) {
      state.mine = []
      state.loadedAt = null
      state.error = null
    },
    SET_MINE(state, bookings) {
      state.mine = bookings
      state.loadedAt = Date.now()
    },
    SET_LOADING(state, isLoading) {
      state.isLoading = isLoading
    },
    SET_SUBMITTING(state, isSubmitting) {
      state.isSubmitting = isSubmitting
    },
    SET_ERROR(state, error) {
      state.error = error
    },
  },
  actions: {
    // E18. Reuses the list for CACHE_MS unless `force` is set.
    async fetchMine({ state, commit }, { force = false } = {}) {
      const isFresh = state.loadedAt && Date.now() - state.loadedAt < CACHE_MS
      if (!force && isFresh && !state.error) return state.mine

      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      try {
        const bookings = (await bookingsApi.listMine()) ?? []
        commit('SET_MINE', bookings)
        return bookings
      } catch (err) {
        commit('SET_ERROR', getErrorMessage(err))
        throw err
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // E10 + E18. Fresh car and the caller's open booking, for the booking UI.
    // Returns { car, block } where block is a BOOKING_BLOCK code or null.
    async checkBookable({ dispatch, getters }, { carId, force = false }) {
      const [car] = await Promise.all([carsApi.getById(carId), dispatch('fetchMine', { force })])
      await dispatch('cars/upsertCar', car, { root: true })

      let block = null
      if (car.status !== CAR_STATUS.FREE) block = BOOKING_BLOCK.CAR_UNAVAILABLE
      else if (getters.openBooking) block = BOOKING_BLOCK.OPEN_BOOKING
      return { car, block }
    },

    // E21 after fresh pre-checks (the backend checks neither availability nor open
    // bookings, Q2). Start fuel and mileage come from the car, never from the user (Q3);
    // the payload is whitelisted so users can't send end fields (Q4).
    async createBooking({ commit, dispatch }, { carId, startDate = null }) {
      commit('SET_SUBMITTING', true)
      commit('SET_ERROR', null)
      try {
        const { car, block } = await dispatch('checkBookable', { carId, force: true })
        if (block) throw bookingBlockedError(block)

        const booking = await bookingsApi.create({
          carId,
          startDate: startDate ?? new Date().toISOString(),
          startFuelLevel: car.fuelLevel,
          startMileage: car.mileage,
        })

        // The booking changed the car's status; refresh both lists in the background
        Promise.allSettled([
          dispatch('fetchMine', { force: true }),
          dispatch('cars/fetchCars', { force: true }, { root: true }),
        ])
        return booking
      } catch (err) {
        commit('SET_ERROR', getErrorMessage(err))
        throw err
      } finally {
        commit('SET_SUBMITTING', false)
      }
    },
  },
}
