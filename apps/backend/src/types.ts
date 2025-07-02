import type { LambdaContext, LambdaEvent } from 'hono-adapter-aws-lambda'
import type { Session } from 'hono-sessions'

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
    session: Session
    session_key_rotation: boolean
  }
}
