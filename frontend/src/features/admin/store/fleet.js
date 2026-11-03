import * as carsApi from '@/shared/api/cars'
import { getErrorMessage } from '@/shared/api/http'
import {
  DEFAULT_FLEET_FILTERS,
  carStatusCounts,
  currentReservedRows,
  filterAdminCars,
  relocationCandidates,
  serviceCandidates,
} from '@/features/admin/utils/admin'

// Fleet management (E11–E17). The car list itself lives in the root `cars` module.
export default {
  namespaced: true,
  state: () => ({
    filters: { ...DEFAULT_FLEET_FILTERS },
    lowFuel: [],
    reserved: [],
    // Which E15 list is shown: reserved cars whose booker's card is (not) authorised
    reservedAuthorized: false,
    isLoadingWidgets: false,
    // Per widget, so a failure is never shown as "nothing to report"
    lowFuelError: null,
    reservedError: null,
    isMutating: false,
  }),
  getters: {
    filteredCars: (state, getters, rootState) =>
      filterAdminCars(rootState.cars.items, state.filters),
    // Status pill counts respect every other filter
    statusCounts: (state, getters, rootState) =>
      carStatusCounts(filterAdminCars(rootState.cars.items, state.filters, { ignore: 'status' })),
    brands: (state, getters, rootState) =>
      [
        ...new Set(rootState.cars.items.map((car) => car.productionInfo?.brand).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b)),
    previewServiceCandidates: (state, getters, rootState) =>
      serviceCandidates(rootState.cars.items),
    previewRelocationCandidates: (state, getters, rootState) =>
      relocationCandidates(rootState.cars.items, rootState.admin.trips.items),
    // E15 rows without past bookers and duplicate cards
    reservedRows: (state, getters, rootState) =>
      currentReservedRows(state.reserved, {
        cars: rootState.cars.items,
        trips: rootState.admin.trips.items,
      }),
  },
  mutations: {
    RESET(state) {
      state.filters = { ...DEFAULT_FLEET_FILTERS }
      state.lowFuel = []
      state.reserved = []
      state.lowFuelError = null
      state.reservedError = null
    },
    SET_FILTERS(state, filters) {
      state.filters = { ...DEFAULT_FLEET_FILTERS, ...filters }
    },
    SET_LOW_FUEL(state, cars) {
      state.lowFuel = cars
    },
    SET_RESERVED(state, { authorized, rows }) {
      state.reservedAuthorized = authorized
      state.reserved = rows
    },
    SET_LOADING_WIDGETS(state, isLoading) {
      state.isLoadingWidgets = isLoading
    },
    SET_LOW_FUEL_ERROR(state, error) {
      state.lowFuelError = error
    },
    SET_RESERVED_ERROR(state, error) {
      state.reservedError = error
    },
    SET_MUTATING(state, isMutating) {
      state.isMutating = isMutating
    },
  },
  actions: {
    setFilters({ state, commit }, partial) {
      commit('SET_FILTERS', { ...state.filters, ...partial })
    },
    resetFilters({ commit }) {
      commit('SET_FILTERS', DEFAULT_FLEET_FILTERS)
    },

    // Wraps a change so `isMutating` is set and errors keep the backend message
    async mutate({ commit }, request) {
      commit('SET_MUTATING', true)
      try {
        return await request()
      } finally {
        commit('SET_MUTATING', false)
      }
    },

    // Reload after a change that already succeeded. A failed reload must not look like a
    // failed change (the admin would repeat it), so it is not thrown: the cars module
    // keeps the error for the list.
    reloadCars({ dispatch }) {
      return dispatch('cars/fetchCars', { force: true }, { root: true }).catch(() => {})
    },

    // E11. The response is not populated (Q9), so the whole list is reloaded.
    async createCar({ dispatch }, car) {
      const created = await dispatch('mutate', () => carsApi.create(car))
      await dispatch('reloadCars')
      return created
    },

    // E12, keyed by VIN; the response is populated and replaces the row
    async updateCar({ dispatch }, { vin, changes }) {
      const car = await dispatch('mutate', () => carsApi.update(vin, changes))
      await dispatch('cars/upsertCar', car, { root: true })
      return car
    },

    // E13 (soft delete)
    async deleteCar({ dispatch }, car) {
      await dispatch('mutate', () => carsApi.remove(car.vin))
      await dispatch('cars/removeCar', car._id, { root: true })
    },

    // E14 and E15 for the side widgets. Each widget keeps its own error; nothing is thrown.
    async fetchWidgets({ state, commit, dispatch }) {
      commit('SET_LOADING_WIDGETS', true)
      try {
        await Promise.allSettled([
          dispatch('fetchLowFuel'),
          dispatch('fetchReserved', state.reservedAuthorized),
        ])
      } finally {
        commit('SET_LOADING_WIDGETS', false)
      }
    },

    async fetchLowFuel({ commit }) {
      try {
        const cars = (await carsApi.listInUseLowFuel()) ?? []
        commit('SET_LOW_FUEL', cars)
        commit('SET_LOW_FUEL_ERROR', null)
        return cars
      } catch (err) {
        commit('SET_LOW_FUEL_ERROR', getErrorMessage(err))
        throw err
      }
    },

    async fetchReserved({ commit }, authorized = false) {
      try {
        const rows = (await carsApi.listReserved(authorized)) ?? []
        commit('SET_RESERVED', { authorized, rows })
        commit('SET_RESERVED_ERROR', null)
        return rows
      } catch (err) {
        commit('SET_RESERVED_ERROR', getErrorMessage(err))
        throw err
      }
    },

    // E16, E17: Mongo update results ({ modifiedCount, … }); the list is reloaded after
    async sendToService({ dispatch }) {
      const result = await dispatch('mutate', () => carsApi.sendOldOrWornToService())
      await dispatch('reloadCars')
      return result
    },

    async relocateFrequent({ dispatch }) {
      const result = await dispatch('mutate', () => carsApi.relocateFrequentlyBooked())
      await dispatch('reloadCars')
      return result
    },
  },
}
