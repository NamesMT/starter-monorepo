import type { HonoJsonWebKey } from 'hono/utils/jwt/jws'
import { WorkOS } from '@workos-inc/node'
import { env } from 'std-env'
import { cacheProvider, getCachedProvider, isNonSharingPlatforms } from '..'

export function getCachedWorkOS(): Awaited<ReturnType<typeof initWorkOS>> | undefined {
  return getCachedProvider('workos-main--workos')
}

export async function getWorkOS() {
  const cached = getCachedWorkOS()

  if (!cached && !isNonSharingPlatforms)
    throw new Error('Not initialized')

  return cached ?? await initWorkOS()
}

export async function initWorkOS() {
  const cached = getCachedWorkOS()

  if (!isNonSharingPlatforms && cached)
    console.warn('Already initialized')

  const requiredEnvs = {
    clientId: env.WORKOS_CLIENT_ID!,
    apiKey: env.WORKOS_API_KEY!,
    redirectUri: env.WORKOS_REDIRECT_URI!,
  }

  const missingEnvs = Object.entries(requiredEnvs).flatMap(([key, value]) => value ? [] : key)
  if (missingEnvs.length)
    throw new Error(`Missing required env: ${missingEnvs.join(', ')}`)

  const workos = new WorkOS(requiredEnvs.apiKey, {
    clientId: requiredEnvs.clientId,
  })

  cacheProvider('workos-main--workos', workos)

  return workos
}

export async function getWorkOSJwks() {
  const workos = await getWorkOS()
  const jwks = workos.userManagement.jwks!

  if (!jwks.jwks())
    await jwks.reload()

  return jwks.jwks()! as { keys: HonoJsonWebKey[] }
}
