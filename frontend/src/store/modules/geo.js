import { DEFAULT_CENTER } from '@/utils/geo'

// Remembers the user's answer for this tab, so the prompt is not shown again
// and a granted location is re-read silently after a reload.
const STORAGE_KEY = 'carshes.geo'
const TIMEOUT_MS = 10000

const readAnswer = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeAnswer = (answer) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, answer)
  } catch {
    // storage blocked: the prompt will simply show again next time
  }
}

const getPosition = () =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: TIMEOUT_MS,
      maximumAge: 60000,
    })
  })

export default {
  namespaced: true,
  state: () => ({
    coords: null,
    // idle → asking → granted | denied; unsupported when the browser has no geolocation
    status: 'idle',
  }),
  getters: {
    hasLocation: (state) => Boolean(state.coords),
    // Where distances and maps start from: the user, or Minsk centre as a fallback
    origin: (state) => state.coords ?? DEFAULT_CENTER,
  },
  mutations: {
    SET_COORDS(state, coords) {
      state.coords = coords
    },
    SET_STATUS(state, status) {
      state.status = status
    },
  },
  actions: {
    // Called on page entry: re-locates only if the user already agreed in this tab
    init({ state, dispatch, commit }) {
      if (state.status !== 'idle') return Promise.resolve()
      const answer = readAnswer()
      if (answer === 'granted') return dispatch('locate')
      if (answer === 'denied') commit('SET_STATUS', 'denied')
      return Promise.resolve()
    },

    // Never rejects: failures fall back to Minsk centre with distances hidden
    async locate({ state, commit }) {
      if (state.status === 'asking') return
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        commit('SET_STATUS', 'unsupported')
        return
      }
      commit('SET_STATUS', 'asking')
      try {
        const { coords } = await getPosition()
        commit('SET_COORDS', { lat: coords.latitude, lng: coords.longitude })
        commit('SET_STATUS', 'granted')
        writeAnswer('granted')
      } catch {
        commit('SET_COORDS', null)
        commit('SET_STATUS', 'denied')
        writeAnswer('denied')
      }
    },
  },
}
