import { createApp } from 'vue'
import 'ant-design-vue/dist/reset.css'
import { createI18n } from './i18n'
import router from './router'
import App from './App.vue'

if (!localStorage.getItem('user::isLoggedIn')) {
  location.href = '/api/v1/user/weblogin'
}

const app = createApp(App)
app.use(createI18n())
app.use(router)
app.mount('vue-app')
