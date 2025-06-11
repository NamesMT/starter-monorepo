import type { UserType } from '@kinde-oss/kinde-typescript-sdk'
import type { LambdaContext, LambdaEvent } from 'hono-adapter-aws-lambda'
import type { Session } from 'hono-sessions'
import type { Simplify } from 'hono/utils/types'

export interface HonoEnv {
  Bindings: {
    event: LambdaEvent
    context: LambdaContext
  }
  Variables: {
    session: Session
    session_key_rotation: boolean
  }
}

export type UserProfileType = Simplify<UserType>
