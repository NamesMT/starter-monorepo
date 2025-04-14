import { withQuery } from 'ufo'

export interface getSignInUrlParams {
  query?: Record<string, string>
}
export function getSignInUrl({ query }: getSignInUrlParams = {}) {
  const runtimeConfig = useRuntimeConfig()

  return withQuery(`${runtimeConfig.public.backendUrl}/api/auth/login`, {
    ...query,
  })
}

export function getSignOutUrl() {
  const runtimeConfig = useRuntimeConfig()

  return `${runtimeConfig.public.backendUrl}/api/auth/logout`
}
