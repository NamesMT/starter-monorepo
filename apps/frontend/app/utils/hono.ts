import type { Awaitable } from '@vueuse/core'
import type { ClientResponse } from 'hono/client'

/**
 * Shortcut for (await hc()).text()
 */
export async function hcText<T extends ClientResponse<any>>(fetchRes: Awaitable<T>): Promise<Awaited<ReturnType<T['text']>>> {
  const res = await fetchRes
  const data = await res.text()

  return data as Awaited<ReturnType<T['text']>>
}

/**
 * Shortcut for (await hc()).json()
 */
export async function hcJson<T extends ClientResponse<any>>(fetchRes: Awaitable<T>): Promise<Awaited<ReturnType<T['json']>>> {
  const res = await fetchRes
  const data = await res.json()

  return data as Awaited<ReturnType<T['json']>>
}

/**
 * Shortcut for omFetch(await hc())
 *
 * Smartly parse the response data, and automatically throw an error if the response is not ok.
 */
export async function hcParse<T extends ClientResponse<any>>(fetchRes: Awaitable<T>): Promise<T extends ClientResponse<infer RT> ? RT : never> {
  const res = await fetchRes

  return omFetch(res)
}
