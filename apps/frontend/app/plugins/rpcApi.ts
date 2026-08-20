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
    // If the frontend and backend domain are on the same domain, we will call the proxy instead of the backendUrl directly
    const backendUrl = runtimeConfig.public.backendUrl
    const urlBackend = new URL(backendUrl)
    const enableProxy = useAppConfig().enableProxy
    const callProxy = enableProxy === 'auto'
      ? urlBackend.hostname === requestUrl.hostname
      : enableProxy
    const apiUrl = import.meta.dev && callProxy
      ? requestUrl.origin + ((runtimeConfig.app.baseURL && runtimeConfig.app.baseURL !== '/') ? runtimeConfig.app.baseURL : '')
      : backendUrl

    // this wrappedFetch calculates the sha256 hash of the request body and adds it to the headers, it is necessary for AWS Lambda + OAC on POST/PUT requests.
    const wrappedFetch = async (url: string | URL | Request, options: RequestInit = {}) => {
      options.headers = new Headers(options.headers || {})
      if (options.body) {
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
      fetch: wrappedFetch,
    } satisfies ClientRequestOptions

    const apiClient = hc<typeof app>(apiUrl, clientRequestOptions)

    return {
      provide: {
        apiClient,
        apiUrl,
      },
    }
  },
})
