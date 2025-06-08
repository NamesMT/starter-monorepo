import { defaultOptions } from '@local/locales/src/index'
import { createI18n } from 'petite-vue-i18n'

export type DeepStringRecord = { [key: string]: string | DeepStringRecord }
async function importBackendLocale(locale: string): Promise<DeepStringRecord> {
  const commonLocale = await import(`@local/locales/dist/${locale}.json`).then(r => r.default)
  const backendLocale = await import(`@local/locales/dist/backend/${locale}.json`).then(r => r.default)
  return { ...commonLocale, ...backendLocale }
}

export const i18n = createI18n({
  ...defaultOptions,
  messages: {
    'en': await importBackendLocale('en'),
    'es': await importBackendLocale('es'),
    'fr': await importBackendLocale('fr'),
    'ru': await importBackendLocale('ru'),
    'vi': await importBackendLocale('vi'),
    'zh-CN': await importBackendLocale('zh-CN'),
  },
})

export const i18nComposer = i18n.global
