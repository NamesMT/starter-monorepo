import { defaultOptions } from 'primevue/config'

export default defineNuxtPlugin({
  name: 'local-li18n',
  parallel: true,
  dependsOn: [
    'local-auth',
  ],
  async setup() {
    const { $i18n, $init } = useNuxtApp()
    const primevue = usePrimeVue()

    const baseLocale = {
      ...defaultOptions.locale!,
      firstDayOfWeek: 1,
    }

    const li18n = reactive({
      renderKey: 0,
    })

    until(() => $init.mounted).toBeTruthy().then(() => {
      watchImmediate(
        () => $i18n.locale.value,
        async (locale) => {
          await setDayjsLocale(locale)

          switch (locale) {
            default:
              primevue.config.locale = { ...baseLocale }
              break
          }

          ++li18n.renderKey
        },
      )
    })

    return {
      provide: {
        li18n,

        /**
         * lmw - Localized-text Mount Wrap
         *
         * If the initial locale haven't been loaded yet, this function returns a placeholder value, so it is safe for SSG-consumption without hydration mismatch.
         */
        lmw: (v: string, stringOrLengthEstimate: string | number = 3) => li18n.renderKey
          ? v
          : typeof stringOrLengthEstimate === 'string' ? stringOrLengthEstimate : '-'.repeat(stringOrLengthEstimate),
      },
    }
  },
})
