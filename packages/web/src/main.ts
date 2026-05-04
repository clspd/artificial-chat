import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import 'ant-design-vue/dist/reset.css'

/**
 * 检查用户是否已登录
 * 如果未登录，跳转到登录中间页
 */
async function checkAuth() {
  const isLoggedIn = localStorage.getItem('user::isLoggedIn')
  if (!isLoggedIn) {
    window.location.href = '/api/v1/user/weblogin'
    return
  }
}

/**
 * 初始化应用
 */
async function initApp() {
  await checkAuth()

  const app = createApp(App)
  app.use(router)
  app.use(i18n)

  // 等待路由准备完成
  await router.isReady()

  // 挂载应用
  app.mount('#vue-app')
}

// 开始初始化
initApp().catch((error) => {
  console.error('Failed to initialize app:', error)
})
