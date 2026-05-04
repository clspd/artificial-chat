import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { createI18n } from './i18n'
import router from './router'

const app = createApp({
  template: '<router-view />',
})

app.use(createI18n())
app.use(router)
app.use(Antd)
app.mount('#vue-app')
