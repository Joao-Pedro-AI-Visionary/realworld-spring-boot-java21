import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Registra o provedor de token e sincroniza o tema antes da primeira navegacao.
useAuthStore(pinia)
useThemeStore(pinia)

app.use(router)
router.isReady().then(() => app.mount('#app'))
