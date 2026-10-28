import { createStore } from 'vuex'

import auth from './modules/auth'

export default createStore({
  strict: import.meta.env.DEV,
  modules: {
    auth,
  },
})
