/**
 * Just a simple plugin that provides a mandatory global state and initializations for the app
 */

import { randomStr } from '@namesmt/utils'

export default defineNuxtPlugin({
  enforce: 'pre',
  name: 'local-init',
  async setup() {
    const state = reactive({
      mounted: false,
      sessionId: `session_${Date.now()}_${randomStr(8)}`,
    })

    return {
      provide: {
        init: state,
      },
    }
  },
})
