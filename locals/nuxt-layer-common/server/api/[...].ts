import { createProxyEventHandler } from 'h3-proxy'

// Supports hot-reloading of the backend server config
let currentBackendUrl = useRuntimeConfig().public.backendUrl
let currentHandler = createHandler()
export default defineEventHandler(async (e) => {
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
})

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
