import { type } from 'arktype'
import { describeRoute, resolver } from 'hono-openapi'
import { appFactory } from '#src/helpers/factory.js'
import { checkAuth } from './$.middleware'

// This route should be accessible only when user is authenticated
export const authCheckRoute = appFactory.createApp()
  .get(
    '',
    checkAuth(),
    describeRoute({
      summary: 'Check that the session is signed in',
      description: `Answers \`OK\` when the request carries a session whose WorkOS access token verifies. Any signed-in user; there are no roles, scopes or ownership rules yet, so every valid session passes. No side effects beyond the cookie refresh/clear \`checkAuth\` performs on a stale token. Answers 401 when there is no session or its token is expired/revoked; a malformed cookie or an unverifiable token surfaces as 500 instead.`,
      responses: {
        200: {
          description: 'The session is valid.',
          content: { 'text/plain': { schema: resolver(type('string')) } },
        },
      },
    }),
    async (c) => {
      return c.text('OK')
    },
  )
