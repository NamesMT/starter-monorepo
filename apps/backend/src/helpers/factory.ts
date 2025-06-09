import type { HonoEnv } from '#src/types.js'
import { createTriggerFactory } from 'hono-adapter-aws-lambda'
import { createFactory } from 'hono/factory'

export const appFactory = createFactory<HonoEnv>()
export const triggerFactory = createTriggerFactory(appFactory.createApp())
