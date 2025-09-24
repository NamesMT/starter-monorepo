import { appFactory } from '#src/helpers/factory.js'
import { getConvexClient } from '#src/providers/baas/convex-main.js'
import { getHelloMessage } from './hello.helper'

export const dummyHelloRoute = appFactory.createApp()
  .get('', async (c) => {
    const convexClient = await getConvexClient().catch(() => null)

    return c.text(getHelloMessage(`i18n and Hono${convexClient ? ' (+ Convex detected)' : ''}`))
  })
