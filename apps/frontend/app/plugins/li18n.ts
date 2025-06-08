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

    watchImmediate(() => $i18n.locale.value, async (locale) => {
      await setDayjsLocale(locale)

      switch (locale) {
        default:
          primevue.config.locale = { ...baseLocale }
          break
      }

      ++li18n.renderKey
    })

    return {
      provide: {
        li18n,

        /**
         * This function wraps the value in a computed with `renderKey`, so it is properly reactive with i18n context
         */
        lw: (v: MaybeRef<string>, lengthEstimate = 3) => computed(() =>
          $init.mounted && li18n.renderKey ? unref(v) : '-'.repeat(lengthEstimate),
        ),
      },
    }
  },
})
