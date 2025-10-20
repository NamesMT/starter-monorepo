import type { UserAuthState } from '@local/common/src/types/user'
import type { LambdaContext, LambdaEvent } from 'hono-adapter-aws-lambda'
import type { CookieState } from 'hono-cookie-state'

export interface HonoEnv {
  Bindings: {
    event: LambdaEvent
    context: LambdaContext

    /**
     * Cloudflare Workers binding
     */
    ASSETS: { fetch: (reqOrUrl: Request | string) => Promise<Response> }
  }
  Variables: {
    'session': CookieState<any>
    'backend-auth': CookieState<{ userAuth?: UserAuthState } & Record<string, any>>
  }
}
