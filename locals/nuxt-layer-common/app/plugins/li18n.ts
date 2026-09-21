export default defineNuxtPlugin({
  name: 'local-li18n',
  parallel: true,
  dependsOn: [
    'local-auth',
  ],
  async setup() {
    const { $init } = useNuxtApp()
    const { locale } = useI18nLocale()

    const li18n = reactive({
      renderKey: 0,
    })

    until(() => $init.mounted).toBeTruthy().then(() => {
      watchImmediate(
        locale,
        async (locale) => {
          if (!locale)
            return

          await setDayjsLocale(locale)

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
