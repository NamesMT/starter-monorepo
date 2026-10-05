import type { app } from 'backend/src/app'
import type { ClientRequestOptions } from 'hono/client'
import { hc } from 'hono/client'

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

    // `x-amz-content-sha256` is required by Lambda + CloudFront OAC on POST/PUT.
    const wrappedFetch = async (url: string | URL | Request, options: RequestInit = {}) => {
      options.headers = new Headers(options.headers || {})
      if (options.body) {
        const payload = await buildOacPayload(options.body)

        if (payload) {
          options.headers.set('x-amz-content-sha256', payload.payloadHash)

          if (payload.replaceBody) {
            options.body = payload.bytes
            // A materialized `FormData` carries its own boundary, which must match these bytes.
            if (payload.contentType)
              options.headers.set('content-type', payload.contentType)
          }
        }
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
