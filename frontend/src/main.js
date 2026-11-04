import { createApp } from 'vue'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@/assets/styles/main.css'

import App from './App.vue'
import http from '@/services/http'
import { installSession } from '@/services/session'
import router from '@/router'
import store from '@/store'
import notify from '@/utils/notify'

installSession(http, { store, router, notify })

createApp(App).use(router).use(store).mount('#app')
