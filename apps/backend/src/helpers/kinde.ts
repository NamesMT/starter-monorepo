import type { HonoEnv } from '#src/types.js'
import type { SessionManager } from '@kinde-oss/kinde-typescript-sdk'
import type { Context } from 'hono'
import type { CookieState } from 'hono-cookie-state'
import { HTTPException } from 'hono/http-exception'

/**
 * This is a wrapper on top of `hono-cookie-state` for Kinde compatibility
 */
export function toKindeSessionManager(cs: CookieState<any>): SessionManager {
  if (!cs)
    throw new HTTPException(400, { message: 'SessionManager requires a CookieState' })

  return {
    async getSessionItem(key: string) {
      return cs.data[key]
    },
    async setSessionItem(key: string, value: unknown) {
      cs.data[key] = value
    },
    async removeSessionItem(key: string) {
      delete cs.data[key]
    },
    async destroySession() {
      cs.data = {}
    },
  }
}

export function getSessionManager(c: Context<HonoEnv>) {
  return toKindeSessionManager(c.get('authVendorSession'))
}
