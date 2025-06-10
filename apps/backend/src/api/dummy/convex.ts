import { appFactory } from '#src/helpers/factory.js'
import { getConvexClient } from '#src/providers/baas/convex-main.js'
import { type } from 'arktype'
import { api } from 'backend-convex/convex/_generated/api'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/arktype'

export const dummyConvexRouteApp = appFactory.createApp()
  .get(
    '',
    describeRoute({
      description: 'Items from `tasks` table',
      responses: {
        200: {
          description: 'The tasks list',
          content: {
            'application/json': { schema: resolver(type({ text: 'string' }).array()) },
          },
        },
      },
    }),
    async (c) => {
      const convexClient = await getConvexClient()
      const allTasks = await convexClient.query(api.tasks.get)
      return c.json(allTasks)
    },
  )
