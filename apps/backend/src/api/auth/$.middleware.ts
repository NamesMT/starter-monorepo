import { appFactory } from '#src/helpers/factory.js'
import { getWorkOS, getWorkOSJwks } from '#src/providers/auth/workos-main.js'
import { DetailedError } from '@namesmt/utils'
import { decode, verifyWithJwks } from 'hono/jwt'

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
  return appFactory.createMiddleware(async (c, next) => {
    const auth = c.get('backend-auth')
    const userAuth = auth.data.userAuth

    if (!userAuth) {
      if (throwOnUnauthenticated)
        throw new DetailedError('user is not authenticated', { statusCode: 401 })

      return await next()
    }

    const _wosPayload = userAuth && await verifyWithJwks(userAuth.private.accessToken, await getWorkOSJwks())
      .catch((e) => {
        // Clears `userAuth` if token is bad
        auth.data.userAuth = undefined

        if (throwOnBadToken)
          throw e
      })

    // TODO: permission tokens system here

    await next()
  })
}
