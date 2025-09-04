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
    console.warn('Already initialized')

  const requiredEnvs = {
    authDomain: env.KINDE_DOMAIN!,
    clientId: env.KINDE_CLIENT_ID!,
    clientSecret: env.KINDE_CLIENT_SECRET!,
    redirectURL: env.KINDE_REDIRECT_URI!,
    logoutRedirectURL: env.KINDE_LOGOUT_REDIRECT_URI!,
  }

  const missingEnvs = Object.entries(requiredEnvs).flatMap(([key, value]) => value ? [] : key)
  if (missingEnvs.length)
    throw new Error(`Missing required env: ${missingEnvs.join(', ')}`)

  const client = createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
    ...requiredEnvs,
  })

  cacheProvider('kinde-main--client', client)

  return client
}
