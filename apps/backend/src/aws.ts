import { handle, streamHandle } from 'hono-adapter-aws-lambda'
import { env } from 'std-env'
import { app } from './app'

export const handler = (env.STREAMING_ENABLED && !env.SST_LIVE)
  ? streamHandle(app)
  : handle(app)
