import { withQuery } from 'ufo'

export interface getSignInUrlParams {
  query?: Record<string, string>
}
export function getSignInUrl({ query }: getSignInUrlParams = {}) {
  const { $apiUrl } = useNuxtApp()

  return withQuery(`${$apiUrl}/api/auth/login`, {
    path: useRequestURL().pathname,
    ...query,
  })
}

export function getSignOutUrl() {
  const { $apiUrl } = useNuxtApp()

  return `${$apiUrl}/api/auth/logout`
}
