import * as carsApi from '@/api/cars'
import { getErrorMessage } from '@/api/http'
import { CAR_STATUS } from '@/utils/derive'
import {
  DEFAULT_FILTERS,
  countByBrand,
  countByStatus,
  effectiveSort,
  filterCars,
  sortCars,
} from '@/utils/fleetFilters'
import { distanceToCar } from '@/utils/geo'

export const CACHE_MS = 30000
export const PAGE_SIZE = 12

// Shared by concurrent callers (fleet page + quick-book modal refresh)
let fetchPromise = null

export default {
  namespaced: true,
  state: () => ({
    items: [],
    isLoading: false,
    error: null,
    filters: { ...DEFAULT_FILTERS },
    visibleCount: PAGE_SIZE,
    loadedAt: null,
  }),
  getters: {
    byId: (state) => (id) => state.items.find((car) => car._id === id) ?? null,

    // { [carId]: metres } — empty without the user's location
    distances: (state, getters, rootState) => {
      const coords = rootState.geo?.coords
      if (!coords) return {}
      return Object.fromEntries(state.items.map((car) => [car._id, distanceToCar(coords, car)]))
    },

    sort: (state, getters, rootState, rootGetters) =>
      effectiveSort(state.filters.sort, Boolean(rootGetters['geo/hasLocation'])),

    filtered: (state) => filterCars(state.items, state.filters),

    sorted: (state, getters) => sortCars(getters.filtered, getters.sort, getters.distances),

    visible: (state, getters) => getters.sorted.slice(0, state.visibleCount),

    hasMore: (state, getters) => getters.sorted.length > state.visibleCount,

    // Pill counts respect every filter except the brand itself
    brandCounts: (state) =>
      countByBrand(filterCars(state.items, state.filters, { ignore: 'brand' })),

    statusCounts: (state) =>
      countByStatus(filterCars(state.items, state.filters, { ignore: 'status' })),

    freeCars: (state) => state.items.filter((car) => car.status === CAR_STATUS.FREE),

    freeCount: (state, getters) => getters.freeCars.length,

    // { car, distance } for the closest free car, or null without location
    nearestFree: (state, getters) => {
      let nearest = null
      for (const car of getters.freeCars) {
        const distance = getters.distances[car._id]
        if (distance === null || distance === undefined) continue
        if (!nearest || distance < nearest.distance) nearest = { car, distance }
      }
      return nearest
    },
  },
  mutations: {
    SET_ITEMS(state, items) {
      state.items = items
      state.loadedAt = Date.now()
    },
    UPSERT_CAR(state, car) {
      const index = state.items.findIndex((item) => item._id === car._id)
      if (index === -1) state.items = [...state.items, car]
      else state.items = state.items.map((item, i) => (i === index ? car : item))
    },
    SET_LOADING(state, isLoading) {
      state.isLoading = isLoading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    SET_FILTERS(state, filters) {
      state.filters = { ...DEFAULT_FILTERS, ...filters }
    },
    SET_VISIBLE_COUNT(state, count) {
      state.visibleCount = count
    },
  },
  actions: {
    // E9. Reuses the list for CACHE_MS unless `force` is set.
    fetchCars({ state, commit }, { force = false } = {}) {
      const isFresh = state.loadedAt && Date.now() - state.loadedAt < CACHE_MS
      if (!force && isFresh && !state.error) return Promise.resolve(state.items)
      if (fetchPromise) return fetchPromise

      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      fetchPromise = carsApi
        .list()
        .then((items) => {
          commit('SET_ITEMS', items ?? [])
          return items
        })
        .catch((err) => {
          commit('SET_ERROR', getErrorMessage(err))
          throw err
        })
        .finally(() => {
          commit('SET_LOADING', false)
          fetchPromise = null
        })
      return fetchPromise
    },

    // Puts a freshly fetched car (GET /cars/:id) into the list
    upsertCar({ commit }, car) {
      if (car?._id) commit('UPSERT_CAR', car)
    },

    // Only commits when something changed, so URL → store syncing stays cheap
    setFilters({ state, commit }, filters) {
      const next = { ...DEFAULT_FILTERS, ...filters }
      const changed = Object.keys(next).some((key) => next[key] !== state.filters[key])
      if (!changed) return
      commit('SET_FILTERS', next)
      commit('SET_VISIBLE_COUNT', PAGE_SIZE)
    },

    resetFilters({ dispatch }) {
      return dispatch('setFilters', DEFAULT_FILTERS)
    },

    showMore({ state, commit }) {
      commit('SET_VISIBLE_COUNT', state.visibleCount + PAGE_SIZE)
    },
  },
}
