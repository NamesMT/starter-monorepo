import type { UserAuthState } from '@local/common/src/types/user'
import type { MiddlewareHandler } from 'hono'
import { DetailedError } from '@namesmt/utils'
import { describeRoute } from 'hono-openapi'
import { decode, verifyWithJwks } from 'hono/jwt'
import { env } from 'std-env'
import { appFactory } from '#src/helpers/factory.js'
import { BACKEND_AUTH_SCHEME, errorResponse } from '#src/helpers/openapi.js'
import { getWorkOS, getWorkOSJwks } from '#src/providers/auth/workos-main.js'

/**
 * Teaches the OpenAPI generator that this middleware requires the session cookie, and that it can
 * answer 401. Attached to every `checkAuth()` variant so guarded routes — including future ones —
 * are documented without any per-route boilerplate.
 *
 * `describeRoute` must be applied to the middleware itself: `findTargetHandler` reads the spec off
 * the handler Hono stores, and a guard registered before the route's own `describeRoute` keeps its
 * `security`/`401` because hono-openapi merges middleware specs in registration order.
 */
function documentedAuth<T extends MiddlewareHandler<any, any, any>>(middleware: T, security: Record<string, string[]>[]) {
  return Object.assign(
    middleware,
    describeRoute({
      security,
      responses: { 401: errorResponse('No session, or its token is expired/revoked.') },
    }),
  )
}

export function keepAuthFresh() {
  return appFactory.createMiddleware(async (c, next) => {
    const workos = await getWorkOS()
    const auth = c.get('backend-auth')
    const userAuth = auth.data.userAuth

    if (!userAuth)
      return await next()

    // `decode` throws on a token that is not three dot-separated parts, and this runs for every
    // request before any route — so an unguarded call turns one malformed cookie into a 500 for
    // the whole API. A token we cannot read is a session we cannot use.
    const expiresAt = tokenExpiry(userAuth.private.accessToken)
    if (expiresAt === undefined) {
      auth.data.userAuth = undefined
      return await next()
    }

    // If token will expire in less than 20 minutes, refresh it
    if (expiresAt * 1000 < Date.now() + 1000 * 60 * 20) {
      await workos.userManagement.authenticateWithRefreshToken({
        clientId: workos.clientId!,
        refreshToken: userAuth.private.refreshToken,
      })
        .then(({ accessToken, refreshToken }) => {
          auth.data.userAuth = {
            ...userAuth,
            private: {
              accessToken,
              refreshToken,
              sessionId: decode(accessToken).payload.sid as string,
            },
          }
        })
        .catch((e) => {
          console.error(e)
          // Clears `userAuth` if there is trouble refreshing
          auth.data.userAuth = undefined
        })
    }

    await next()
  })
}

/** The token's `exp` claim, or `undefined` when the token cannot be decoded at all. */
function tokenExpiry(token: string): number | undefined {
  try {
    const exp = decode(token).payload.exp
    return typeof exp === 'number' ? exp : undefined
  }
  catch {
    return undefined
  }
}

export type checkAuthParams = {
  /**
   * Throws when the user is simply not authenticated yet (expired/revoked is still valid).
   *
   * @default true
   */
  throwOnUnauthenticated?: boolean

  /**
   * Throws when user is authenticated but the token fails to verify (including expired/revoked, etc).
   *
   * @default true
   */
  throwOnBadToken?: boolean
}
export function checkAuth({ throwOnUnauthenticated = true, throwOnBadToken = true }: checkAuthParams = {}) {
  const middleware = appFactory.createMiddleware(async (c, next) => {
    const auth = c.get('backend-auth')
    const userAuth = auth.data.userAuth

    if (!userAuth) {
      if (throwOnUnauthenticated)
        throw new DetailedError('user is not authenticated', { statusCode: 401 })

      return await next()
    }

    const payload = await verifyWithJwks(userAuth.private.accessToken, { ...await getWorkOSJwks(), allowedAlgorithms: ['RS256'] })
      .catch((e) => {
        // Clears `userAuth` if token is bad
        auth.data.userAuth = undefined

        if (throwOnBadToken)
          throw e
      })

    if (!payload)
      return await next()

    // The cookie is the session; the token is the proof. Nothing above ties them together:
    // a cookie naming any user would otherwise be accepted as long as it carried *some*
    // validly signed token. Bind the two on the subject, the session, and the WorkOS
    // environment that issued the token.
    const mismatch = sessionTokenMismatch(payload, userAuth)
    if (mismatch) {
      auth.data.userAuth = undefined

      if (throwOnBadToken)
        throw new DetailedError(mismatch, { statusCode: 401 })
    }

    // TODO: permission tokens system here

    await next()
  })

  // Optional auth: the session may be absent, so the requirement is "cookie or no cookie".
  // With `throwOnUnauthenticated: false` a bad token also only clears the session, hence no 401.
  const security: Record<string, string[]>[] = throwOnUnauthenticated
    ? [{ [BACKEND_AUTH_SCHEME]: [] }]
    : [{ [BACKEND_AUTH_SCHEME]: [] }, {}]

  return documentedAuth(middleware, security)
}

/**
 * Returns why a verified token does not belong to the session that presented it, or
 * `undefined` when they agree.
 *
 * Signature verification alone cannot tell our WorkOS environment from any other — every
 * environment's tokens are signed by WorkOS — and it says nothing about *which* user the
 * cookie claims to be. These identity checks are what make the cookie non-forgeable.
 */
export function sessionTokenMismatch(
  payload: Record<string, any>,
  userAuth: UserAuthState,
) {
  if (payload.sub !== userAuth.id)
    return 'session user does not match token subject'

  // Stored from the same token at sign-in; a different value means the session was swapped.
  if (payload.sid && payload.sid !== userAuth.private.sessionId)
    return 'session does not match token session'

  // Bind to our WorkOS environment. `client_id` is the direct signal; fall back to `iss`,
  // which embeds it (`https://api.workos.com/user_management/<clientId>`).
  const clientId = env.WORKOS_CLIENT_ID
  if (clientId) {
    const tokenClientId = payload.client_id ?? payload.azp
    if (typeof tokenClientId === 'string' && tokenClientId !== clientId)
      return 'token was issued for a different WorkOS client'
    if (typeof payload.iss === 'string' && !payload.iss.includes(clientId))
      return 'token issuer is not this WorkOS client'
  }

  return undefined
}
