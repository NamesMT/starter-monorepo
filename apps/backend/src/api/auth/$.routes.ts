import { objectOmit, objectPick } from '@namesmt/utils'
import { type } from 'arktype'
import { describeRoute, resolver } from 'hono-openapi'
import { decode } from 'hono/jwt'
import { env } from 'std-env'
import { appFactory } from '#src/helpers/factory.js'
import { getWorkOS } from '#src/providers/auth/workos-main.js'
import { checkAuth } from './$.middleware'

export const authRoutesApp = appFactory.createApp()
  .get(
    '/authState',
    checkAuth({
      throwOnBadToken: false,
      throwOnUnauthenticated: false,
    }),
    describeRoute({
      summary: 'Read the current auth state',
      description: `Returns the caller's auth state: the profile without its \`private\` block plus an access/refresh token pair, or \`{ userAuth: null, tokens: null }\` when there is no session. Public, no session needed: a missing, expired or revoked session token is reported as signed-out instead of an error. Reads the sealed \`backend-auth\` cookie only — never WorkOS — and rewrites that cookie when a bad token is dropped. The tokens are handed to page JavaScript, so a frontend XSS inherits the refresh token.`,
      responses: {
        200: {
          description: 'The current session, or nulls when signed out.',
          content: {
            // Nullable on purpose: signed-out is a 200, not a 401.
            'application/json': {
              schema: resolver(type({
                userAuth: type({
                  'id': 'string',
                  'firstName': 'string',
                  'fullName': 'string',
                  'email': 'string',
                  'avatar?': 'string',
                }).or('null'),
                tokens: type({
                  accessToken: 'string',
                  refreshToken: 'string',
                }).or('null'),
              })),
            },
          },
        },
      },
    }),
    async (c) => {
      const auth = c.get('backend-auth')

      const userAuth = auth.data.userAuth
      if (!userAuth) {
        return c.json({
          userAuth: null,
          tokens: null,
        })
      }

      return c.json({
        userAuth: objectOmit(userAuth, ['private']),
        tokens: objectPick(userAuth.private, ['accessToken', 'refreshToken']),
      })
    },
  )

  .get(
    '/login',
    describeRoute({
      summary: 'Start WorkOS sign-in and redirect',
      description: `Redirects to the WorkOS AuthKit sign-in page. Public, no session needed. Records the \`path\` query in the sealed \`backend-auth\` cookie so the callback knows where to return, then answers 302 to AuthKit. \`path\` is concatenated onto \`FRONTEND_URL\` rather than resolved, so it cannot leave the frontend origin.`,
      responses: {
        302: {
          description: 'Redirect to the AuthKit authorize URL.',
          headers: {
            'location': { description: 'WorkOS authorize URL for this client.', schema: { type: 'string' } },
            'set-cookie': { description: 'Sealed `backend-auth` cookie holding `backToPath`.', schema: { type: 'string' } },
          },
        },
      },
    }),
    async (c) => {
      const workos = await getWorkOS()
      const auth = c.get('backend-auth')

      // Correlates the callback with the browser that started the flow. Without it, an
      // attacker can complete sign-in with their own account and hand the callback URL to a
      // victim, silently signing the victim into the attacker's account.
      const state = crypto.randomUUID()

      const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      // Specify that we'd like AuthKit to handle the authentication flow
        provider: 'authkit',
        clientId: workos.clientId!,
        redirectUri: env.WORKOS_REDIRECT_URI!,
        state,
      })

      auth.data.backToPath = c.req.query('path')
      auth.data.authState = state

      // Redirect the user to the AuthKit sign-in page
      return c.redirect(authorizationUrl)
    },
  )

  .get(
    '/callback',
    describeRoute({
      summary: 'Finish sign-in and set the session',
      description: `Exchanges the AuthKit \`code\` for a WorkOS session, writes the profile plus its access and refresh tokens into the sealed \`backend-auth\` cookie, and redirects to the \`path\` saved by \`/login\` (default \`/\`, always on \`FRONTEND_URL\`). Public, no session needed, but \`state\` must match the value \`/login\` stored in the caller's sealed cookie; it is cleared on first use, so a callback URL cannot be replayed and login CSRF is refused. Answers 400 \`No code provided\` when \`code\` is absent and 400 \`Invalid sign-in state\` on a missing or mismatched \`state\`; a bogus or expired code surfaces as a provider error, not a 401.`,
      responses: {
        302: {
          description: 'Redirect back to the frontend, with the session cookie set.',
          headers: {
            'location': { description: '`FRONTEND_URL` + the saved `backToPath`.', schema: { type: 'string' } },
            'set-cookie': { description: 'Sealed `backend-auth` cookie holding the new session.', schema: { type: 'string' } },
          },
        },
        400: {
          description: 'Missing `code`, or a missing or mismatched `state`.',
          content: { 'text/plain': { schema: resolver(type('string')) } },
        },
      },
    }),
    async (c) => {
      const workos = await getWorkOS()
      const auth = c.get('backend-auth')

      const code = c.req.query('code')
      if (!code)
        return c.text('No code provided', 400)

      // Single-use: cleared whether or not it matched, so a leaked callback URL cannot be
      // replayed and a failed check cannot be retried with a guessed value.
      const expectedState = auth.data.authState
      delete auth.data.authState
      if (!expectedState || c.req.query('state') !== expectedState)
        return c.text('Invalid sign-in state', 400)

      const { user, accessToken, refreshToken } = await workos.userManagement.authenticateWithCode({
        clientId: workos.clientId!,
        code,
        session: { sealSession: false }, // We will manage the session ourselves via `hono-cookie-state`, no need to seal here.
      })

      auth.data.userAuth = {
        id: user.id,
        avatar: user.profilePictureUrl || undefined,
        email: user.email,
        firstName: user.firstName || 'N/A',
        fullName: `${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`,

        private: {
          accessToken,
          refreshToken,
          sessionId: decode(accessToken).payload.sid as string,
        },
      }

      let backToPath = auth.data.backToPath as string || '/'
      if (!backToPath.startsWith('/'))
        backToPath = `/${backToPath}`
      return c.redirect(`${env.FRONTEND_URL!}${backToPath}`)
    },
  )

  .get(
    '/logout',
    describeRoute({
      summary: 'End the session and sign out',
      description: `Drops the \`backend-auth\` cookie and redirects to the WorkOS logout URL for the stored session, which revokes it. Anyone may call it; without a session it just answers 302 to \`/\` on the API origin. State-changing GET, so a cross-site top-level navigation can force a sign-out.`,
      responses: {
        302: {
          description: 'Redirect to the WorkOS logout URL, or to `/` when already signed out.',
          headers: {
            'location': { description: 'WorkOS logout URL, or `/`.', schema: { type: 'string' } },
            'set-cookie': { description: 'Sealed `backend-auth` cookie with the session cleared.', schema: { type: 'string' } },
          },
        },
      },
    }),
    async (c) => {
      const workos = await getWorkOS()
      const auth = c.get('backend-auth')
      if (!auth.data.userAuth)
        return c.redirect('/')

      const url = workos.userManagement.getLogoutUrl({
        sessionId: auth.data.userAuth.private.sessionId,
      })

      auth.data = {}

      return c.redirect(url)
    },
  )
