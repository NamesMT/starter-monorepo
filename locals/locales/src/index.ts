export interface LocaleMeta {
  /** Locale code used across the monorepo (also the dist JSON filename, e.g. `en`, `zh-CN`) */
  code: string
  /** BCP-47 language tag used as the i18n `iso` / `<html lang>` value (e.g. `en-US`, `vi-VN`) */
  languageISO: string
  /** Endonym — human-readable name in the language itself */
  name: string
}

/**
 * Single source of truth for the supported locales.
 *
 * Keep the `source`/`targets` list in the root `i18n.json` (lingo.dev) in sync
 * with this list when adding/removing a locale.
 */
export const locales: LocaleMeta[] = [
  { code: 'en', languageISO: 'en-US', name: 'English' },
  { code: 'es', languageISO: 'es-ES', name: 'Español' },
  { code: 'fr', languageISO: 'fr-FR', name: 'Français' },
  { code: 'ru', languageISO: 'ru-RU', name: 'Русский' },
  { code: 'vi', languageISO: 'vi-VN', name: 'Tiếng Việt' },
  { code: 'zh-CN', languageISO: 'zh-CN', name: '中文' },
]

export const localeCodes = locales.map(locale => locale.code)

export const defaultLocaleCode = 'en'
