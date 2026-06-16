import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'
import { postPageView } from './api/endpoints'
import './styles/tokens.css'
import './styles/home.css'
import './styles/index.css'

// Register page-view stats hook once at app startup
router.afterEach((to) => {
  postPageView({ path: to.path, ts: Date.now() }).catch(() => {})
})

createApp(App).use(createPinia()).use(router).mount('#app')
