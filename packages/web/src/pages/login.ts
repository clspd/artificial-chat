import { createApp } from 'vue'
import { createI18n } from '@/i18n'
import LoginForm from './LoginForm.vue'

const app = createApp(LoginForm)
app.use(createI18n())
app.mount('#app')
