import { logger } from '#src/helpers/logger.js'
import { createKindeServerClient, GrantType } from '@kinde-oss/kinde-typescript-sdk'
import { env } from 'std-env'
import { cacheProvider, getCachedProvider, isNonSharingPlatforms } from '..'

export function getCachedKindeClient() {
  return getCachedProvider<ReturnType<typeof createKindeServerClient<GrantType.AUTHORIZATION_CODE>>>('kinde-main--client')
}

export async function getKindeClient() {
  const cachedClient = getCachedKindeClient()

  if (!cachedClient && !isNonSharingPlatforms)
    throw new Error('Not initialized')

  return cachedClient ?? await initKindeClient()
}

export async function initKindeClient() {
  const cachedClient = getCachedKindeClient()

  if (!isNonSharingPlatforms && cachedClient)
    logger.warn('Already initialized')

  const client = createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
    authDomain: env.KINDE_DOMAIN!,
    clientId: env.KINDE_CLIENT_ID!,
    clientSecret: env.KINDE_CLIENT_SECRET!,
    redirectURL: env.KINDE_REDIRECT_URI!,
    logoutRedirectURL: env.KINDE_LOGOUT_REDIRECT_URI!,
  })

  cacheProvider('kinde-main--client', client)

  return client
}
