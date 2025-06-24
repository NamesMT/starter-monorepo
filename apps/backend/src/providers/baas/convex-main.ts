import { ConvexHttpClient } from 'convex/browser'
import { env } from 'std-env'
import { cacheProvider, getCachedProvider, isNonSharingPlatforms } from '..'

export function getCachedConvexClient() {
  return getCachedProvider<ConvexHttpClient>('convex-main--client')
}

export async function getConvexClient() {
  const cachedClient = getCachedConvexClient()

  if (!cachedClient && !isNonSharingPlatforms)
    throw new Error('Not initialized')

  return cachedClient ?? await initConvexClient()
}

export async function initConvexClient() {
  const cachedClient = getCachedConvexClient()

  if (!isNonSharingPlatforms && cachedClient)
    console.warn('Already initialized')

  if (!env.CONVEX_URL)
    throw new Error('CONVEX_URL is not set')

  const client = new ConvexHttpClient(env.CONVEX_URL!)

  cacheProvider('convex-main--client', client)

  return client
}
