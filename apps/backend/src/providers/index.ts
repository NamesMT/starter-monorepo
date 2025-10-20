import { env as honoEnv } from 'hono/adapter'
import { createMiddleware } from 'hono/factory'
import { runtime } from 'std-env'
import { initWorkOS } from './auth/workos-main'
import { initConvexClient } from './baas/convex-main'

export const nonSharingPlatforms = new Set(['workerd'])
export const isNonSharingPlatforms = nonSharingPlatforms.has(runtime)
export const providersState = {
  initialized: false,
  cacheMap: {} as Record<string, any>,
}

export function getCachedProvider<T>(key: string): T | undefined {
  return providersState.cacheMap[key]
}

export function cacheProvider(key: string, provider: any) {
  providersState.cacheMap[key] = provider
}

export const providersInit = createMiddleware(async (c, next) => {
  // Inject env to global context (to access environments with std-env in workerd)
  // @ts-expect-error globalThis not typed
  globalThis.__env__ = honoEnv(c)

  // On platforms that cannot share data between requests, clean the initialized clients and initalize as needed, else, initialize them once and reuse.
  if (isNonSharingPlatforms) {
    providersState.cacheMap = {}
  }
  else {
    if (!providersState.initialized) {
      await Promise.all([
        initWorkOS(),
        // WARN: allows Convex to fail initializing, in case template user does not opt-in for Convex, please remove the catch or this whole line depends on your need in production
        initConvexClient().catch(() => { }),
      ])

      providersState.initialized = true
    }
  }

  await next()
})
