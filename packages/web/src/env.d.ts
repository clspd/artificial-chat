declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'i18next-vue' {
  import type { i18n } from 'i18next'
  import type { Plugin } from 'vue'

  export function useTranslation(): {
    t: (key: string, options?: Record<string, unknown>) => string
    i18n: i18n
  }

  const plugin: Plugin
  export default plugin
}
