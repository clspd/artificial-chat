import i18next from 'i18next'
import i18nextVue from 'i18next-vue'
import zh from './locales/zh-CN.json'
import en from './locales/en.json'

const detectedLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en'

i18next.init({
  lng: detectedLang,
  fallbackLng: 'en',
  resources: {
    'zh-CN': { translation: zh },
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false,
  },
})

export function createI18n() {
  return {
    install(app: any) {
      app.use(i18nextVue, { i18next })
    },
  }
}

export default i18next
