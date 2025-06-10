import { appFactory } from '#src/helpers/factory.js'
import { getCachedConvexClient } from '#src/providers/baas/convex-main.js'
import { getHelloMessage } from './hello.helper'

export const dummyHelloRouteApp = appFactory.createApp()
  .get('', async (c) => {
    const convexClient = getCachedConvexClient()

    return c.text(getHelloMessage(`i18n and Hono ${convexClient ? '(+ Convex detected)' : ''}`))
  })
