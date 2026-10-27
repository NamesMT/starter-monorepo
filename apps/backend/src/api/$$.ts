import { type } from 'arktype'
import { describeRoute, resolver } from 'hono-openapi'
import { appFactory } from '#src/helpers/factory.js'

export const apiRoute = appFactory.createApp()
  .get(
    '',
    describeRoute({
      summary: 'Check API health',
      description: 'Returns the plain-text body `OK` as a liveness check for the `/api` prefix. Public, no session needed: the handler reads no input and touches no stored data. The only side effect comes from the app-wide session middleware, which refreshes a near-expiry `backend-auth` cookie and clears it when that refresh fails, so a caller may receive `Set-Cookie`.',
      responses: {
        200: {
          description: 'Service is up',
          content: {
            'text/plain': { schema: resolver(type('string')) },
          },
        },
      },
    }),
    async c => c.text('OK'),
  )
