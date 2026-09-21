import type { ConvexVueContext } from 'convex-vue'

export default defineNuxtPlugin({
  enforce: 'post',
  name: 'local-init',
  dependsOn: ['local-auth'],
  parallel: true,
  async setup() {
    const { $auth } = useNuxtApp()

    // Init convex client if url configured
    const convexVueContext = inject<ConvexVueContext>('convex-vue')
    // Don't init if on server, see https://github.com/chris-visser/convex-vue/issues/6
    if (import.meta.client && convexVueContext?.options?.url) {
      convexVueContext.initClient(convexVueContext.options)
      // Also set auth hook for the client
      convexVueContext.clientRef.value?.setAuth(async () => {
        return $auth.token
      })
    }
  },
})
