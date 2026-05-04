import i18next from 'i18next'
import I18nextVue from 'i18next-vue'

// 中文翻译
const zhCN = {
  app: {
    title: 'Artificial Chat',
  },
  auth: {
    login: '登录',
    register: '注册',
    logout: '登出',
    username: '用户名',
    password: '密码',
    inviteCode: '邀请码',
    rememberPassword: '记住密码',
  },
  chat: {
    newChat: '新对话',
    noChatHistory: '暂无对话记录',
    selectOrCreateChat: '请选择或创建一个对话',
    sendMessage: '发送消息',
    loading: '加载中...',
  },
  messages: {
    error: '错误',
    success: '成功',
    warning: '警告',
    info: '提示',
  },
}

// 英文翻译
const enUS = {
  app: {
    title: 'Artificial Chat',
  },
  auth: {
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    inviteCode: 'Invite Code',
    rememberPassword: 'Remember Password',
  },
  chat: {
    newChat: 'New Chat',
    noChatHistory: 'No chat history',
    selectOrCreateChat: 'Please select or create a chat',
    sendMessage: 'Send Message',
    loading: 'Loading...',
  },
  messages: {
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },
}

// 初始化i18next
i18next.init({
  lng: localStorage.getItem('i18nextLng') || 'zh-CN',
  debug: false,
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  interpolation: {
    escapeValue: false,
  },
})

/**
 * 创建i18n插件
 */
const i18n = {
  install(app: any) {
    app.use(I18nextVue, { i18next })
  },
}

export default i18n
