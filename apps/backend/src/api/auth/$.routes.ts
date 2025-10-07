/**
 * This file contains routes and sample routes for possible APIs usecases with Kinde.
 */

// import type { ClaimTokenType, FlagType } from '@kinde-oss/kinde-typescript-sdk'
import { appFactory } from '#src/helpers/factory.js'
import { getSessionManager } from '#src/helpers/kinde.js'
import { getKindeClient } from '#src/providers/auth/kinde-main.js'
import { objectOmit } from '@local/common/src/utils/general'
import { env } from 'std-env'

export const authRoutesApp = appFactory.createApp()
  .get('/health', async (c) => {
    return c.text('Good', 200)
  })

  // This endpoint returns the current auth state
  .get('/authState', async (c) => {
    const session = c.get('session')

    const userAuth = session.data.userAuth
    const tokens = userAuth?.tokens ?? null

    return c.json({ userAuth: userAuth ? objectOmit(userAuth, ['tokens']) : null, tokens })
  })

  .get('/login', async (c) => {
    const kindeClient = await getKindeClient()
    const org_code = c.req.query('org_code')
    const session = c.get('session')

    const loginUrl = await kindeClient.login(getSessionManager(c), { org_code })

    session.data.backToPath = c.req.query('path')

    return c.redirect(loginUrl.toString())
  })

  .get('/register', async (c) => {
    const kindeClient = await getKindeClient()
    const org_code = c.req.query('org_code')

    const registerUrl = await kindeClient.register(getSessionManager(c), { org_code })

    return c.redirect(registerUrl.toString())
  })

  .get('/callback', async (c) => {
    const kindeClient = await getKindeClient()
    const session = c.get('session')
    const sessionManager = getSessionManager(c)

    await kindeClient.handleRedirectToApp(sessionManager, new URL(c.req.url))

    let backToPath = session.data.backToPath as string || '/'
    if (!backToPath.startsWith('/'))
      backToPath = `/${backToPath}`

    const kindeProfile = await kindeClient.getUserProfile(sessionManager)

    session.data.userAuth = {
      id: kindeProfile.id,
      avatar: kindeProfile.picture || undefined,
      email: kindeProfile.email,
      firstName: kindeProfile.given_name,
      // @ts-expect-error Kinde SDK is dumb
      fullName: kindeProfile.name,

      tokens: {
        accessToken: await kindeClient.getToken(sessionManager),
      },
    }

    return c.redirect(`${env.FRONTEND_URL!}${backToPath}`)
  })

  .get('/logout', async (c) => {
    const kindeClient = await getKindeClient()

    const logoutUrl = await kindeClient.logout(getSessionManager(c))

    return c.redirect(logoutUrl.toString())
  })

  // This endpoint checks if kinde session is authenticated
  .get('/isAuth', async (c) => {
    const kindeClient = await getKindeClient()

    const isAuthenticated = await kindeClient.isAuthenticated(getSessionManager(c))

    return c.json(isAuthenticated)
  })

// .get('/profile', async (c) => {
//   const kindeClient = await getKindeClient()

//   const profile = await kindeClient.getUserProfile(getSessionManager(c))

//   return c.json(profile)
// })

// .get('/createOrg', async (c) => {
//   const kindeClient = await getKindeClient()
//   const org_name = c.req.query('org_name')?.toString()

//   const createUrl = await kindeClient.createOrg(getSessionManager(c), { org_name })

//   return c.redirect(createUrl.toString())
// })

// .get('/getOrg', async (c) => {
//   const kindeClient = await getKindeClient()

//   const org = await kindeClient.getOrganization(getSessionManager(c))

//   return c.json(org)
// })

// .get('/getOrgs', async (c) => {
//   const kindeClient = await getKindeClient()

//   const orgs = await kindeClient.getUserOrganizations(getSessionManager(c))

//   return c.json(orgs)
// })

// .get('/getPerm/:perm', async (c) => {
//   const kindeClient = await getKindeClient()

//   const perm = await kindeClient.getPermission(getSessionManager(c), c.req.param('perm'))

//   return c.json(perm)
// })

// .get('/getPerms', async (c) => {
//   const kindeClient = await getKindeClient()

//   const perms = await kindeClient.getPermissions(getSessionManager(c))

//   return c.json(perms)
// })

// // Try: /api/auth/getClaim/aud, /api/auth/getClaim/email/id_token
// .get('/getClaim/:claim', async (c) => {
//   const kindeClient = await getKindeClient()
//   const type = (c.req.query('type') ?? 'access_token') as ClaimTokenType

//   if (!/^(?:access_token|id_token)$/.test(type))
//     return c.text('Bad request: type', 400)

//   const claim = await kindeClient.getClaim(getSessionManager(c), c.req.param('claim'), type)
//   return c.json(claim)
// })

// .get('/getFlag/:code', async (c) => {
//   const kindeClient = await getKindeClient()

//   const claim = await kindeClient.getFlag(
//     getSessionManager(c),
//     c.req.param('code'),
//     c.req.query('default'),
//     c.req.query('flagType') as keyof FlagType | undefined,
//   )

//   return c.json(claim)
// })

// .get('/getToken', async (c) => {
//   const kindeClient = await getKindeClient()

//   const accessToken = await kindeClient.getToken(getSessionManager(c))

//   return c.text(accessToken)
// })
