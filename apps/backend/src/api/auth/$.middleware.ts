import type { MiddlewareHandler } from 'hono'
import { DetailedError } from '@namesmt/utils'
import { describeRoute } from 'hono-openapi'
import { decode, verifyWithJwks } from 'hono/jwt'
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

    // If token will expire in less than 20 minutes, refresh it
    if ((decode(userAuth.private.accessToken)?.payload?.exp || 0) * 1000 < Date.now() + 1000 * 60 * 20) {
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

    const _wosPayload = userAuth && await verifyWithJwks(userAuth.private.accessToken, { ...await getWorkOSJwks(), allowedAlgorithms: ['RS256'] })
      .catch((e) => {
        // Clears `userAuth` if token is bad
        auth.data.userAuth = undefined

        if (throwOnBadToken)
          throw e
      })

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
