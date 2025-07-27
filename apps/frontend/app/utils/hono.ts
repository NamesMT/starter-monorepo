import type { Awaitable } from '@vueuse/core'
import type { ClientResponse } from 'hono/client'
import { fetchRP } from 'fetch-result-please'

/**
 * Shortcut for (await api()).text(), with types inference.
 */
export async function hcText<T extends ClientResponse<any>>(fetchRes: Awaitable<T>): Promise<Awaited<ReturnType<T['text']>>> {
  const res = await fetchRes
  const data = await res.text()

  return data as Awaited<ReturnType<T['text']>>
}

/**
 * Shortcut for (await api()).json(), with types inference.
 */
export async function hcJson<T extends ClientResponse<any>>(fetchRes: Awaitable<T>): Promise<Awaited<ReturnType<T['json']>>> {
  const res = await fetchRes
  const data = await res.json()

  return data as Awaited<ReturnType<T['json']>>
}

/**
 * Shortcut for fetchRP(api()), with types inference.
 *
 * Smartly parse the response data, and automatically throw an error if the response is not ok.
 */
export async function hcParse<T extends ClientResponse<any>>(fetchRes: Awaitable<T>): Promise<T extends ClientResponse<infer RT> ? RT : never> {
  return fetchRP(fetchRes)
}
