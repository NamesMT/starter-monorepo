import { appFactory } from '#src/helpers/factory.js'
import { getSessionManager } from '#src/helpers/kinde.js'
import { getKindeClient } from '#src/providers/auth/kinde-main.js'
import { DetailedError } from '@namesmt/utils'
import { decode } from 'hono/jwt'

export function keepAuthFresh() {
  return appFactory.createMiddleware(async (c, next) => {
    const kindeClient = await getKindeClient()
    const session = c.get('session')
    const sessionManager = getSessionManager(c)

    const userAuth = session.data.userAuth
    if (!userAuth)
      return await next()

    const accessToken = await kindeClient.getToken(getSessionManager(c))

    // If token will expire in less than 20 minutes, refresh it
    if ((decode(accessToken)?.payload?.exp || 0) * 1000 < Date.now() + 1000 * 60 * 20) {
      const tokenRefresh = await kindeClient.refreshTokens(sessionManager, true)

      session.data.userAuth = {
        ...userAuth,
        tokens: { accessToken: tokenRefresh.access_token },
      }
    }

    await next()
  })
}

export type checkAuthParams = {
  /**
   * If false, will only throw if user is authenticated but token verification fails.
   *
   * @default true
   */
  throwOnUnauthenticated?: boolean
}
export function checkAuth({ throwOnUnauthenticated = true }: checkAuthParams = {}) {
  return appFactory.createMiddleware(async (c, next) => {
    const session = c.get('session')
    const userAuth = session.data.userAuth
    if (!userAuth) {
      if (throwOnUnauthenticated)
        throw new DetailedError('user is not authenticated', { statusCode: 401 })

      return await next()
    }

    // TODO: permission tokens system here

    await next()
  })
}
