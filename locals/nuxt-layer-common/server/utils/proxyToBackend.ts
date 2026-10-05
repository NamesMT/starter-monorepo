import type { H3Event } from 'h3'
import { createProxyEventHandler } from 'h3-proxy'

// Supports hot-reloading of the backend server config
let currentBackendUrl = useRuntimeConfig().public.backendUrl
let currentHandler = createHandler()

/**
 * Proxies a request to the backend.
 *
 * Nuxt needs both a catch-all (`[...].ts`) and a bare index route for this to cover `/api`
 * itself, which is the backend's health check; both delegate here.
 */
export function proxyToBackend(e: H3Event) {
  const backendUrl = useRuntimeConfig().public.backendUrl
  if (currentBackendUrl !== backendUrl) {
    currentHandler = createHandler()
    currentBackendUrl = backendUrl
  }

  return currentHandler(e).catch((err: Error) => {
    console.error('Error when trying to proxy request, is the backend server available?')
    console.error(err)

    setResponseStatus(e, 500, 'Server Error')
  })
}

function createHandler() {
  return createProxyEventHandler({
    target: currentBackendUrl,
    enableLogger: false,
    changeOrigin: true,
    configureProxyRequest: () => ({
      streamRequest: true,
      sendStream: true,
      fetchOptions: { redirect: 'manual' },
      headers: {
        Origin: useRuntimeConfig().public.frontendUrl,
      },
    }),
  })
}
