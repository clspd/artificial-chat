import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import { createI18n } from '@/i18n'
import RegisterForm from './RegisterForm.vue'

const app = createApp(RegisterForm)
app.use(createI18n())
app.use(Antd)
app.mount('#app')
