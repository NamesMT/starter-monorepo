import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { Doc, Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import { createOpenAI } from '@ai-sdk/openai'
import RateLimiter, { MINUTE } from '@convex-dev/rate-limiter'
import { zValidator } from '@hono/zod-validator'
import { randomStr, sample, sleep } from '@namesmt/utils'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { ConvexError } from 'convex/values'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { throttle } from 'kontroll'
import { z } from 'zod'
import { api, components, internal } from '../_generated/api'

const orModels = process.env.AI_MODELS_LIST?.split(',') ?? ['qwen/qwen3-32b:free']
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
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
  // Old endpoint for minimal testing, should use `/chat/stream` in consumer side
  .post('/chat', zValidator('json', z.object({ messages: aiMessagesSchema })), async (c) => {
    const userIdentity = await c.env.auth.getUserIdentity()
    if (userIdentity === null)
      throw new ConvexError({ msg: 'Not authenticated' })

    await rateLimiter.limit(c.env, 'aiChat', { key: userIdentity.subject, throws: true })

    const { messages } = c.req.valid('json')

    const result = streamText({
      model: openrouter(sample(orModels, 1)[0]),
      messages,
      system: 'Return response in markdown format, remember to response cleanly with linebreaks instead of endless paragraphs.',
    })

    return result.toDataStreamResponse()
  })
  .post(
    '/chat/stream',
    zValidator('json', z.object({
      threadId: z.string(),
      provider: z.string(),
      model: z.string(),
      apiKey: z.string(),
      content: z.optional(z.string()),
      resumeStreamId: z.optional(z.string()),
      finishOnly: z.optional(z.boolean()),
      lockerKey: z.optional(z.string()),
    }).refine(data => data.content !== undefined || data.resumeStreamId !== undefined, {
      message: `Either 'content' or 'resumeStreamId' must be provided.`,
      path: ['content', 'resumeStreamId'],
    })),
    async (c) => {
      const {
        threadId: _threadId,
        provider,
        model,
        apiKey,
        content,
        resumeStreamId,
        finishOnly,
        lockerKey,
      } = c.req.valid('json')

      // getUserIdentity on HTTP Action will throw if not authenticated 🤦‍♂️
      const userIdentity = await c.env.auth.getUserIdentity().catch(() => null)

      if (userIdentity === null && !lockerKey)
        throw new ConvexError({ msg: 'Not authenticated' })

      await rateLimiter.limit(c.env, 'aiChat', { key: userIdentity?.subject ?? lockerKey, throws: true })

      const _providerSdk = (() => {
        switch (provider) {
          case 'openai':
            return createOpenAI({ apiKey })
          case 'openrouter':
            return createOpenRouter({ apiKey })
          default:
            return undefined
        }
      })()

      // Cast type and runQuery to check for permission
      const threadId = _threadId as Id<'threads'>
      const thread = await c.env.runQuery(api.threads.get, { threadId, lockerKey })

      let streamId: string
      let streamingMessageId: Id<'messages'>
      let existingMessage: Doc<'messages'> | null = null

      // Disable SSE resume for now until we have pub sub
      if (resumeStreamId)
        throw new ConvexError('SSE stream resume is disabled')

      if (resumeStreamId) {
        streamId = resumeStreamId

        // Check if there's an existing streaming message to resume
        existingMessage = await c.env.runQuery(internal.messages.getStreamingMessage, {
          streamId,
        })

        if (!existingMessage) {
          // If no streaming message found, just return success
          // This handles the case where the message was already cleaned up
          return c.text('OK')
        }

        streamingMessageId = existingMessage._id

        // If finishOnly is true, just mark as finished and return
        if (finishOnly) {
          await c.env.runMutation(internal.messages.finishStreaming, { streamId })
          await c.env.runMutation(internal.threads.updateThreadInfo, { threadId, timestamp: Date.now() })
          c.text('OK')
        }
      }
      else if (content) {
        if (thread.frozen)
          throw new ConvexError(`Can't send new messages to frozen thread`)

        // Create new streaming session
        streamId = `${Date.now()}_${randomStr(10)}`

        // Add user message to thread
        await c.env.runMutation(api.messages.add, {
          threadId,
          role: 'user',
          content,
          provider,
          model,
          lockerKey,
        })

        // Create initial streaming message
        streamingMessageId = await c.env.runMutation(api.messages.add, {
          threadId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          streamId,
          provider,
          model,
          lockerKey,
        })
      }
      else {
        throw new ConvexError('Unexpected')
      }

      // Get conversation history
      const messages = await c.env.runQuery(api.messages.listByThread, { threadId, lockerKey })

      // Prepare messages for AI API (exclude the streaming messages)
      const messagesContext = messages
        .filter(msg => !msg.isStreaming)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }))

      // Create streaming response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let aiResponse = existingMessage ? existingMessage.content : ''

            // Send session ID first
            controller.enqueue(encoder.encode(`o: ${JSON.stringify({
              messageId: streamingMessageId,
              sessionId: streamId,
              resuming: !!existingMessage,
            })}\n`))

            // If resuming, send existing content first
            if (existingMessage && existingMessage.content) {
              controller.enqueue(encoder.encode(`o: ${JSON.stringify({
                content: existingMessage.content,
                isResume: true,
              })}\n`))
            }

            // Call AI provider

            // Using hosted provider and model for now, switch to user configured BYOK when UI is ready for it
            const providerStream = streamText({
              model: openrouter(sample(orModels, 1)[0]),
              messages: messagesContext,
              onError: (e) => {
                throw e.error
              },
            })

            let pendingSave = false
            for await (const textDelta of providerStream.textStream) {
              if (textDelta) {
                aiResponse += textDelta
                controller.enqueue(encoder.encode(`t: ${textDelta}`))

                pendingSave = true
                throttle(
                  500,
                  async () => {
                    await c.env.runMutation(api.messages.updateStreamingMessage, {
                      messageId: streamingMessageId,
                      content: aiResponse,
                      isStreaming: true,
                      lockerKey,
                    }).finally(() => {
                      pendingSave = false
                    })
                  },
                  { trailing: true },
                )
              }
            }
            // eslint-disable-next-line no-unmodified-loop-condition
            while (pendingSave)
              await sleep(1000)

            // Finish streaming
            await c.env.runMutation(internal.messages.finishStreaming, { streamId })
            await c.env.runMutation(internal.threads.updateThreadInfo, { threadId, timestamp: Date.now() })

            // // Generate new thread title
            // await c.env.runAction(api.threads.generateTitle, { threadId, lockerKey, apiKey })

            controller.enqueue(encoder.encode(`o: ${JSON.stringify({ done: true })}\n`))
            controller.close()
          }
          catch (error: any) {
            // Mark streaming as finished on error
            await c.env.runMutation(internal.messages.finishStreaming, { streamId })

            controller.enqueue(encoder.encode(`o: ${JSON.stringify({ error: error.message })}\n`))
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    },
  )
