import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { ActionCtx } from '../_generated/server'
import RateLimiter, { MINUTE } from '@convex-dev/rate-limiter'
import { zValidator } from '@hono/zod-validator'
import { sample } from '@namesmt/utils'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { ConvexError } from 'convex/values'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { components } from '../_generated/api'

const models = process.env.AI_MODELS_LIST?.split(',') ?? ['qwen/qwen3-32b:free']
const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey)
  throw new Error('Missing OPENROUTER_API_KEY')

const openrouter = createOpenRouter({
  apiKey,
})

const aiMessagesSchema = z.array(
  z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  }),
)

const rateLimiter = new RateLimiter(components.rateLimiter, {
  aiChat: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 3 },
})

export const aiApp: HonoWithConvex<ActionCtx> = new Hono()
aiApp
  .use(cors())
  .post('/chat', zValidator('json', z.object({ messages: aiMessagesSchema })), async (c) => {
    const userIdentity = await c.env.auth.getUserIdentity()
    if (userIdentity === null)
      throw new ConvexError({ msg: 'Not authenticated' })

    await rateLimiter.limit(c.env, 'aiChat', { key: userIdentity.subject, throws: true })

    const { messages } = c.req.valid('json')

    const result = streamText({
      model: openrouter(sample(models, 1)[0]),
      messages,
    })

    return result.toDataStreamResponse()
  })
