import { appFactory } from '#src/helpers/factory.js'
import { getWorkOS } from '#src/providers/auth/workos-main.js'
import { objectOmit, objectPick } from '@namesmt/utils'
import { decode } from 'hono/jwt'
import { env } from 'std-env'
import { checkAuth } from './$.middleware'

export const authRoutesApp = appFactory.createApp()
  // This endpoint returns the current auth state
  .get(
    '/authState',
    checkAuth({
      throwOnBadToken: false,
      throwOnUnauthenticated: false,
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

  .get('/login', async (c) => {
    const workos = await getWorkOS()
    const auth = c.get('backend-auth')

    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    // Specify that we'd like AuthKit to handle the authentication flow
      provider: 'authkit',
      clientId: workos.clientId!,
      redirectUri: env.WORKOS_REDIRECT_URI!,
    })

    auth.data.backToPath = c.req.query('path')

    // Redirect the user to the AuthKit sign-in page
    return c.redirect(authorizationUrl)
  })

  .get('/callback', async (c) => {
    const workos = await getWorkOS()
    const auth = c.get('backend-auth')

    const code = c.req.query('code')
    if (!code)
      return c.text('No code provided', 400)

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
  })

  .get('/logout', async (c) => {
    const workos = await getWorkOS()
    const auth = c.get('backend-auth')
    if (!auth.data.userAuth)
      return c.redirect('/')

    const url = workos.userManagement.getLogoutUrl({
      sessionId: auth.data.userAuth.private.sessionId,
    })

    auth.data = {}

    return c.redirect(url)
  })
