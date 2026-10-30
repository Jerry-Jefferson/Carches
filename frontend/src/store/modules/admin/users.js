import { getErrorMessage } from '@/api/http'
import * as usersApi from '@/api/users'
import { DEFAULT_USER_FILTERS, filterUsers, tripCountsByUser } from '@/utils/admin'

// Users (E5–E8)
export default {
  namespaced: true,
  state: () => ({
    items: [],
    filters: { ...DEFAULT_USER_FILTERS },
    isLoading: false,
    isMutating: false,
    error: null,
    loadedAt: null,
  }),
  getters: {
    byId: (state) => (id) => state.items.find((user) => user._id === id) ?? null,
    filteredUsers: (state) => filterUsers(state.items, state.filters),
    // { [userId]: { total, completed } }
    tripCounts: (state, getters, rootState) => tripCountsByUser(rootState.admin.trips.items),
  },
  mutations: {
    RESET(state) {
      state.items = []
      state.error = null
      state.loadedAt = null
    },
    SET_ITEMS(state, items) {
      state.items = items
      state.loadedAt = Date.now()
    },
    UPSERT(state, user) {
      const exists = state.items.some((item) => item._id === user._id)
      state.items = exists
        ? state.items.map((item) => (item._id === user._id ? user : item))
        : [...state.items, user]
    },
    REMOVE(state, id) {
      state.items = state.items.filter((item) => item._id !== id)
    },
    SET_FILTERS(state, filters) {
      state.filters = { ...DEFAULT_USER_FILTERS, ...filters }
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
    // E5
    async fetchUsers({ commit, rootState }) {
      // A response that arrives after sign-out is dropped (the next user must not see it)
      const token = rootState.auth?.token
      const isSameSession = () => rootState.auth?.token === token
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      try {
        const users = (await usersApi.list()) ?? []
        if (!isSameSession()) return []
        commit('SET_ITEMS', users)
        return users
      } catch (err) {
        if (isSameSession()) commit('SET_ERROR', getErrorMessage(err))
        throw err
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // E6, for the details drawer; refreshes the row too
    async fetchUser({ commit }, id) {
      const user = await usersApi.getById(id)
      commit('UPSERT', user)
      return user
    },

    // E7. Role and password are ignored by the backend (Q10).
    async updateUser({ commit, dispatch, rootState }, { id, changes }) {
      commit('SET_MUTATING', true)
      try {
        const user = await usersApi.update(id, changes)
        commit('UPSERT', user)
        // The admin edited their own account: keep the header and profile in sync
        if (rootState.auth?.user?._id === id) commit('auth/SET_USER', user, { root: true })
        // Trips show the populated user, so reload them for the new name / e-mail
        dispatch('admin/trips/fetchTrips', null, { root: true }).catch(() => {})
        return user
      } finally {
        commit('SET_MUTATING', false)
      }
    },

    // E8 (soft delete; the backend also soft-deletes the user's credit cards)
    async deleteUser({ commit }, id) {
      commit('SET_MUTATING', true)
      try {
        await usersApi.remove(id)
        commit('REMOVE', id)
      } finally {
        commit('SET_MUTATING', false)
      }
    },

    setFilters({ state, commit }, partial) {
      commit('SET_FILTERS', { ...state.filters, ...partial })
    },
  },
}
