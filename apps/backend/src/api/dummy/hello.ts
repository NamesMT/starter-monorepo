import { type } from 'arktype'
import { describeRoute, resolver } from 'hono-openapi'
import { appFactory } from '#src/helpers/factory.js'
import { getConvexClient } from '#src/providers/baas/convex-main.js'
import { getHelloMessage } from './hello.helper'

export const dummyHelloRoute = appFactory.createApp()
  .get(
    '',
    describeRoute({
      summary: 'Greet from the i18n sample route',
      description: 'Returns a localized greeting followed by the current epoch milliseconds, e.g. `Hello from i18n and Hono (+ Convex detected)! - 1793091753118`. The message reads the `hello-from-{x}` key in the default locale — there is no `locale` parameter — and mentions Convex only when a Convex client is configured. Public, no session needed. The output changes on every call because of the timestamp; the Convex check never hits the network and a failure to obtain a client only drops the `(+ Convex detected)` suffix instead of failing the request.',
      responses: {
        200: {
          description: 'The greeting line',
          content: {
            'text/plain': { schema: resolver(type('string')) },
          },
        },
      },
    }),
    async (c) => {
      const convexClient = await getConvexClient().catch(() => null)

      return c.text(getHelloMessage(`i18n and Hono${convexClient ? ' (+ Convex detected)' : ''}`))
    },
  )
