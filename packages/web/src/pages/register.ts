import { createApp } from 'vue'
import { createI18n } from '@/i18n'
import RegisterForm from './RegisterForm.vue'

const app = createApp(RegisterForm)
app.use(createI18n())
app.mount('#app')
