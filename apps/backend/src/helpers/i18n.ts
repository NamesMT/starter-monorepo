import { getByPath, interpolate } from '@i18n-micro/core'
import { defaultLocaleCode } from '@local/locales/src/index'

// NOTE: JSON bundles are imported with *literal* specifiers on purpose, for bundle-time inlining.
// Keep in sync with `localeCodes` from `@local/locales/src/index`.
const messages = {
  'en': {
    ...(await import('@local/locales/dist/en.json')).default,
    ...(await import('@local/locales/dist/backend/en.json')).default,
  },
  'es': {
    ...(await import('@local/locales/dist/es.json')).default,
    ...(await import('@local/locales/dist/backend/es.json')).default,
  },
  'fr': {
    ...(await import('@local/locales/dist/fr.json')).default,
    ...(await import('@local/locales/dist/backend/fr.json')).default,
  },
  'ru': {
    ...(await import('@local/locales/dist/ru.json')).default,
    ...(await import('@local/locales/dist/backend/ru.json')).default,
  },
  'vi': {
    ...(await import('@local/locales/dist/vi.json')).default,
    ...(await import('@local/locales/dist/backend/vi.json')).default,
  },
  'zh-CN': {
    ...(await import('@local/locales/dist/zh-CN.json')).default,
    ...(await import('@local/locales/dist/backend/zh-CN.json')).default,
  },
} as Record<string, Record<string, unknown>>

/**
 * Interpolation values for {@link translate}, plus an optional `locale`, e.g.
 * `translate('hello', { locale })` or `translate('hello-from-{x}', { x: 'me' })`.
 */
export type TranslateParams = Record<string, string | number | boolean | undefined> & { locale?: string }

/**
 * Translate a key, optionally in a specific locale.
 *
 * Vue-free on purpose (see #55): `petite-vue-i18n` pulled `vue` into the Workers bundle.
 * Falls back to the default locale, then to the raw key when the translation is missing.
 */
export function translate(key: string, params: TranslateParams = {}): string {
  const { locale, ...values } = params
  const target = locale ?? defaultLocaleCode
  const message = getByPath(messages[target], key) ?? getByPath(messages[defaultLocaleCode], key)

  // `interpolate` takes defined values only; skipping `undefined`s leaves the `{placeholder}` as-is.
  const interpolationParams: Record<string, string | number | boolean> = {}
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined)
      interpolationParams[name] = value
  }

  return interpolate(typeof message === 'string' ? message : key, interpolationParams)
}
