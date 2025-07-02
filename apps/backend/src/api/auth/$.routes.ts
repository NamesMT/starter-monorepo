/**
 * This file contains routes and sample routes for possible APIs usecases with Kinde.
 */

import type { UserProfileType } from '@local/common/src/types/user'
// import type { ClaimTokenType, FlagType } from '@kinde-oss/kinde-typescript-sdk'
import { appFactory } from '#src/helpers/factory.js'
import { getSessionManager } from '#src/helpers/kinde.js'
import { getKindeClient } from '#src/providers/auth/kinde-main.js'
import { env } from 'std-env'

export const authRoutesApp = appFactory.createApp()
  .get('/health', async (c) => {
    return c.text('Good', 200)
  })

  .get('/authState', async (c) => {
    const kindeClient = await getKindeClient()
    const sessionManager = getSessionManager(c)

    const [profile, token] = await Promise.all([
      kindeClient.getUserProfile(sessionManager).catch(() => null) as Promise<UserProfileType>,
      kindeClient.getToken(sessionManager).catch(() => null),
    ])

    return c.json({ profile, token })
  })

  .get('/login', async (c) => {
    const kindeClient = await getKindeClient()
    const org_code = c.req.query('org_code')

    const loginUrl = await kindeClient.login(getSessionManager(c), { org_code })

    c.get('session').set('backToPath', c.req.query('path'))

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

    await kindeClient.handleRedirectToApp(getSessionManager(c), new URL(c.req.url))

    let backToPath = c.get('session').get('backToPath') as string || '/'
    if (!backToPath.startsWith('/'))
      backToPath = `/${backToPath}`

    return c.redirect(`${env.FRONTEND_URL!}${backToPath}`)
  })

  .get('/logout', async (c) => {
    const kindeClient = await getKindeClient()

    const logoutUrl = await kindeClient.logout(getSessionManager(c))

    return c.redirect(logoutUrl.toString())
  })

// .get('/isAuth', async (c) => {
//   const kindeClient = await getKindeClient()

//   const isAuthenticated = await kindeClient.isAuthenticated(getSessionManager(c)) // Boolean: true or false

//   return c.json(isAuthenticated)
// })

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
