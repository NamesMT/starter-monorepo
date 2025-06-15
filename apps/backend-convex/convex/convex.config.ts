import rateLimiter from '@convex-dev/rate-limiter/convex.config'
import shardedCounter from '@convex-dev/sharded-counter/convex.config'
import { defineApp } from 'convex/server'

const app: ReturnType<typeof defineApp> = defineApp()
app.use(rateLimiter)
app.use(shardedCounter)

export default app
