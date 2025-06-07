import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import duration from 'dayjs/plugin/duration'
import isoWeek from 'dayjs/plugin/isoWeek'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(timezone)
dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(advancedFormat)
dayjs.extend(localizedFormat)

export { dayjs }

// Its necessary to pre-define the map of all locales that will be used here for optimized bundling.
// Refer to https://github.com/iamkun/dayjs/tree/dev/src/locale for all locales.
const asyncLocaleMap: Record<string, () => Promise<any>> = {
  'en': () => import('dayjs/locale/en'),
  'es': () => import('dayjs/locale/es'),
  'fr': () => import('dayjs/locale/fr'),
  'ru': () => import('dayjs/locale/ru'),
  'vi': () => import('dayjs/locale/vi'),
  'zh-cn': () => import('dayjs/locale/zh-cn'),
}

export async function setDayjsLocale(locale: string) {
  locale = locale.toLowerCase()

  const localeInMap = asyncLocaleMap[locale]
  if (!localeInMap) {
    console.error(`Locale "${locale}" does not exists, fallback to "en"`)
    locale = 'en'
  }
  else {
    await localeInMap()
  }

  dayjs.locale(locale)
}

export interface dateSuffixParams {
  start?: number
  end?: number
  download?: boolean
  format?: string
  delimiter?: string
}
/**
 * Utility function to generate a date suffix string for things like reports
 */
export function dateSuffix({ start, end, download, format = 'YYYY-MM-DD', delimiter = '_' }: dateSuffixParams = {}) {
  let str = ''

  if (start)
    str += `${delimiter}s=${dayjs(start).format(format)}`

  if (typeof end !== 'undefined')
    str += `${delimiter}e=${dayjs(end).format(format)}`

  if (download)
    str += `${delimiter}d=${dayjs().format(format)}`

  return str
}
