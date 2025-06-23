import { defaultOptions } from '@local/locales/src/index'
import { createI18n } from 'petite-vue-i18n'

const locales = {
  'en': {
    ...(await import('@local/locales/dist/en.json').then(r => r.default)),
    ...(await import('@local/locales/dist/backend/en.json').then(r => r.default)),
  },
  'es': {
    ...(await import('@local/locales/dist/es.json').then(r => r.default)),
    ...(await import('@local/locales/dist/backend/es.json').then(r => r.default)),
  },
  'fr': {
    ...(await import('@local/locales/dist/fr.json').then(r => r.default)),
    ...(await import('@local/locales/dist/backend/fr.json').then(r => r.default)),
  },
  'ru': {
    ...(await import('@local/locales/dist/ru.json').then(r => r.default)),
    ...(await import('@local/locales/dist/backend/ru.json').then(r => r.default)),
  },
  'vi': {
    ...(await import('@local/locales/dist/vi.json').then(r => r.default)),
    ...(await import('@local/locales/dist/backend/vi.json').then(r => r.default)),
  },
  'zh-CN': {
    ...(await import('@local/locales/dist/zh-CN.json').then(r => r.default)),
    ...(await import('@local/locales/dist/backend/zh-CN.json').then(r => r.default)),
  },
}

export const i18n = createI18n({
  ...defaultOptions,
  messages: locales,
})

export const i18nComposer = i18n.global
