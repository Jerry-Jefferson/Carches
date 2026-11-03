import { createApp } from 'vue'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import './shared/styles/main.css'

import App from './app/App.vue'
import http from './shared/api/http'
import { installSession } from './app/session'
import router from './app/router'
import store from './app/store'
import notify from './shared/utils/notify'

installSession(http, { store, router, notify })

createApp(App).use(router).use(store).mount('#app')
