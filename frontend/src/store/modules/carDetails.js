import * as carsApi from '@/api/cars'
import { getErrorMessage } from '@/api/http'
import { distanceToCar } from '@/utils/geo'

// 400 "Invalid car ID format" and 404 "Car not found" both mean "not in the fleet"
const NOT_FOUND_CODES = [400, 404]

export default {
  namespaced: true,
  state: () => ({
    car: null,
    isLoading: false,
    error: null,
    notFound: false,
  }),
  getters: {
    // Metres from the user, or null without location
    distance: (state, getters, rootState) => {
      const coords = rootState.geo?.coords
      return coords && state.car ? distanceToCar(coords, state.car) : null
    },
  },
  mutations: {
    SET_CAR(state, car) {
      state.car = car
    },
    SET_LOADING(state, isLoading) {
      state.isLoading = isLoading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    SET_NOT_FOUND(state, notFound) {
      state.notFound = notFound
    },
  },
  actions: {
    // E10. A different id clears the previous car so its data never flashes on the
    // new page; `silent` refreshes (polling) keep the page as it is on failure.
    async fetchCar({ state, commit, dispatch }, { id, silent = false }) {
      if (state.car && state.car._id !== id) commit('SET_CAR', null)
      if (!silent) {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        commit('SET_NOT_FOUND', false)
      }
      try {
        const car = await carsApi.getById(id)
        commit('SET_CAR', car)
        commit('SET_ERROR', null)
        dispatch('cars/upsertCar', car, { root: true })
        return car
      } catch (err) {
        if (silent) return null
        commit('SET_NOT_FOUND', NOT_FOUND_CODES.includes(err.statusCode))
        commit('SET_ERROR', getErrorMessage(err))
        throw err
      } finally {
        if (!silent) commit('SET_LOADING', false)
      }
    },

    // A fresh copy of the current car, e.g. from the booking pre-check
    setCar({ state, commit }, car) {
      if (car?._id && car._id === state.car?._id) commit('SET_CAR', car)
    },
  },
}
