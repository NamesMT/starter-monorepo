import type { UserAuthState } from '@local/common/src/types/user'
import type { Reactive } from 'vue'

export type AuthState = (
  { loggedIn: true, user: Omit<UserAuthState, 'private'>, token: string }
  | { loggedIn: false, user: null, token: null }
)

// The current plugin targets SSG and CSR, if you use SSR, you need to converts it to useState and useAsyncData for optimized performance

// Note: token is passed down for use with 3rd party integrations like Convex, if you only use `frontend` and `backend`, you can remove it to be more secure.

export default defineNuxtPlugin({
  name: 'local-auth',
  parallel: true,
  dependsOn: [
    'local-rpcApi',
  ],
  async setup() {
    const { $apiClient } = useNuxtApp()
    const authApi = $apiClient.api.auth

    const auth = reactive({
      loggedIn: false,
      user: null,
      token: null,
    }) as Reactive<AuthState>

    async function refreshAuth() {
      const authState = await hcParse(authApi.authState.$get()).catch(() => null)

      if (authState?.userAuth) {
        auth.loggedIn = true
        auth.user = authState.userAuth
        auth.token = authState.tokens!.accessToken!
      }
      else {
        auth.loggedIn = false
        auth.user = null
        auth.token = null
      }

      // Refresh every 15 minutes
      if (import.meta.client)
        setTimeout(refreshAuth, 1000 * 60 * 15)
    }

    await refreshAuth()

    return {
      provide: {
        auth,
      },
    }
  },
})
