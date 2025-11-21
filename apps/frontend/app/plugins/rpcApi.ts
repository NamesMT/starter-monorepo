import type { app } from 'backend/src/app'
import type { ClientRequestOptions } from 'hono/client'
import { hc } from 'hono/client'
import { sha256 } from 'hono/utils/crypto'

export default defineNuxtPlugin({
  name: 'local-rpcApi',
  parallel: true,
  async setup() {
    const requestUrl = useRequestURL()
    const runtimeConfig = useRuntimeConfig()
    const backendUrl = runtimeConfig.public.backendUrl
    const urlBackend = new URL(backendUrl)
    const enableProxy = useAppConfig().enableProxy
    // `auto`: if the frontend and backend domain are on the same domain, we will call the proxy instead of the backendUrl directly
    const callProxy = enableProxy === 'auto'
      ? urlBackend.hostname === requestUrl.hostname
      : enableProxy
    const apiUrl = import.meta.dev && callProxy
      ? requestUrl.origin + ((runtimeConfig.app.baseURL && runtimeConfig.app.baseURL !== '/') ? runtimeConfig.app.baseURL : '')
      : backendUrl

    // this wrappedFetch calculates the sha256 hash of the request body and adds it to the headers, it is necessary for AWS Lambda + OAC on POST/PUT requests.
    const wrappedFetch = async (url: string | URL | Request, options?: RequestInit) => {
      if (options?.body) {
        options.headers = new Headers(options.headers || {})
        // TODO: make sure this work well with all forms of BodyInit, i.e: FormData, Blob, etc.
        options.headers.set(
          'x-amz-content-sha256',
          (await sha256(typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body)))!,
        )
      }

      return fetch(url, options)
    }

    const clientRequestOptions = {
      init: { credentials: 'include' },
      headers: {} as Record<string, any>,
      fetch: wrappedFetch,
    } satisfies ClientRequestOptions

    const apiClient = hc<typeof app>(apiUrl, clientRequestOptions)

    // Uncomment to include an Authorization header with the session token
    // await _withHeaderSession()

    async function _withHeaderSession() {
      const { sign } = await import('hono/jwt')
      const token = useCookie('headerSessionToken', {
        sameSite: 'strict',
        secure: true,
      })

      if (!token.value)
        token.value = await sign({ id: Math.random() + Date.now() }, 'top-secret')

      clientRequestOptions.headers.Authorization = `Bearer ${token.value}`
    }

    return {
      provide: {
        apiClient,
        apiUrl,
      },
    }
  },
})
