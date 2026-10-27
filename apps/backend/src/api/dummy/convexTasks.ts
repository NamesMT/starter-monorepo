import { type } from 'arktype'
import { api } from 'backend-convex/convex/_generated/api'
import { describeRoute, resolver } from 'hono-openapi'
import { appFactory } from '#src/helpers/factory.js'
import { getConvexClient } from '#src/providers/baas/convex-main.js'

export const dummyConvexTasksRoute = appFactory.createApp()
  .get(
    '',
    describeRoute({
      summary: 'List tasks from the shared Convex table',
      description: 'Returns every document in the shared Convex `tasks` table. Public, no session needed: the handler has no auth guard and the table is not tenant-scoped, so any caller reads all rows, including the Convex system fields (`_id`, `_creationTime`) that the 200 schema does not declare. Read-only, no writes. Answers 500 when Convex is not configured (`CONVEX_URL` unset) or the query fails, and the table is never paginated, so the whole collection is read and serialized on every call.',
      responses: {
        200: {
          description: 'The tasks list',
          content: {
            'application/json': { schema: resolver(type({ text: 'string' }).array()) },
          },
        },
        500: {
          description: 'Convex is not configured, or the `tasks` query failed.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    }),
    async (c) => {
      const convexClient = await getConvexClient()
      const allTasks = await convexClient.query(api.tasks.get)
      return c.json(allTasks)
    },
  )
