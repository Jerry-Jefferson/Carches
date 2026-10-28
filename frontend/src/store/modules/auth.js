import * as authApi from '@/api/auth'
import * as usersApi from '@/api/users'
import { getErrorMessage } from '@/api/http'
import { initials } from '@/utils/format'
import { clearToken, loadToken, saveToken } from '@/utils/tokenStorage'

// One bootstrap per page load, shared by concurrent callers (guard + components)
let bootstrapPromise = null

export default {
  namespaced: true,
  state: () => ({
    user: null,
    token: null,
    remember: false,
    // idle → bootstrapping → ready (the stored session has been checked)
    status: 'idle',
    isSubmitting: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    isAdmin: (state) => state.user?.role === 'admin',
    fullName: (state) =>
      [state.user?.firstName, state.user?.lastName].filter(Boolean).join(' ') ||
      state.user?.email ||
      '',
    initials: (state) => initials(state.user),
  },
  mutations: {
    SET_SESSION(state, { user, token, remember }) {
      state.user = user
      state.token = token
      state.remember = remember
    },
    SET_TOKEN(state, { token, remember }) {
      state.token = token
      state.remember = remember
    },
    SET_USER(state, user) {
      state.user = user
    },
    CLEAR_SESSION(state) {
      state.user = null
      state.token = null
      state.remember = false
    },
    SET_STATUS(state, status) {
      state.status = status
    },
    SET_SUBMITTING(state, isSubmitting) {
      state.isSubmitting = isSubmitting
    },
    SET_ERROR(state, error) {
      state.error = error
    },
  },
  actions: {
    // E2. `remember` picks localStorage over sessionStorage for the token.
    async signIn({ dispatch }, { email, password, remember = false }) {
      return dispatch('submit', {
        request: () => authApi.signIn({ email, password }),
        remember,
      })
    },

    // E1. New accounts are signed in for this tab only.
    async signUp({ dispatch }, profile) {
      return dispatch('submit', { request: () => authApi.signUp(profile), remember: false })
    },

    async submit({ commit }, { request, remember }) {
      commit('SET_SUBMITTING', true)
      commit('SET_ERROR', null)
      try {
        const { user, token } = await request()
        saveToken(token, { remember })
        commit('SET_SESSION', { user, token, remember })
        commit('SET_STATUS', 'ready')
        return user
      } catch (err) {
        commit('SET_ERROR', getErrorMessage(err))
        throw err
      } finally {
        commit('SET_SUBMITTING', false)
      }
    },

    // E3. The local session is cleared even if the request fails (expired token, offline).
    async logout({ dispatch }) {
      try {
        await authApi.logout()
      } catch {
        // nothing to do: the token is discarded either way
      } finally {
        await dispatch('clearSession')
      }
    },

    // E4. Restores a stored session once per page load; any failure drops the token.
    bootstrap({ state, commit }) {
      if (state.status === 'ready') return Promise.resolve()
      if (bootstrapPromise) return bootstrapPromise

      const stored = loadToken()
      if (!stored) {
        commit('SET_STATUS', 'ready')
        return Promise.resolve()
      }

      commit('SET_STATUS', 'bootstrapping')
      commit('SET_TOKEN', stored)
      bootstrapPromise = usersApi
        // A 401 here is handled below, not by the global "session expired" redirect
        .getMe({ skipAuthRedirect: true })
        .then((user) => commit('SET_USER', user))
        .catch(() => {
          clearToken()
          commit('CLEAR_SESSION')
        })
        .finally(() => {
          commit('SET_STATUS', 'ready')
          bootstrapPromise = null
        })
      return bootstrapPromise
    },

    // E4 again, e.g. after an admin changes the current user's details
    async refreshMe({ commit }) {
      const user = await usersApi.getMe()
      commit('SET_USER', user)
      return user
    },

    clearSession({ commit }) {
      clearToken()
      commit('CLEAR_SESSION')
      commit('SET_ERROR', null)
    },
  },
}
