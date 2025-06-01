import type { ComposerOptions } from 'petite-vue-i18n'

export const defaultOptions = {
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  fallbackWarn: false,
  missingWarn: false,
} satisfies ComposerOptions & { legacy: false }
