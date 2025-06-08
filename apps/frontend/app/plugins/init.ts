/**
 * Just a simple plugin that provides a mandatory global state and initializations for the app
 */

export default defineNuxtPlugin({
  enforce: 'pre',
  name: 'local-init',
  parallel: true,
  async setup() {
    const state = reactive({
      mounted: false,
    })
    return {
      provide: {
        init: state,
      },
    }
  },
})
