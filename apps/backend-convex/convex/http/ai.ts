import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { Doc, Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import { createOpenAI } from '@ai-sdk/openai'
import RateLimiter, { MINUTE } from '@convex-dev/rate-limiter'
import { zValidator } from '@hono/zod-validator'
import { randomStr, sleep } from '@namesmt/utils'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { ConvexError } from 'convex/values'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { throttle } from 'kontroll'
import { z } from 'zod'
import { getAgentModel } from '../../utils/agent'
import { buildAiSdkMessage } from '../../utils/message'
import { api, components, internal } from '../_generated/api'

const rateLimiter = new RateLimiter(components.rateLimiter, {
  aiChat: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 3 },
})

export const aiApp: HonoWithConvex<ActionCtx> = new Hono()
aiApp
  .use(cors())
  .post(
    '/chat/stream',
    zValidator('json', z.object({
      threadId: z.string(),
      provider: z.string(),
      model: z.string(),
      apiKey: z.optional(z.string()),
      content: z.optional(z.string()),
      context: z.optional(z.object({
        from: z.optional(z.string()),
      })),
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
        context = {},
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
        await c.env.runMutation(internal.messages.add, {
          threadId,
          role: 'user',
          content,
          context: { ...context, uid: userIdentity?.subject ?? 'N/A' },
          provider,
          model,
          lockerKey,
        })

        // Add assistant message to thread (initial streaming)
        streamingMessageId = await c.env.runMutation(internal.messages.add, {
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

      // Prepare messages for AI API
      const messagesContext = messages
        .filter(msg => msg._id !== streamingMessageId)
        .map(buildAiSdkMessage)

      let aiResponse = existingMessage ? existingMessage.content : ''

      let pendingSave = false
      function doSave() {
        pendingSave = true
        throttle(
          500,
          async () => {
            await c.env.runMutation(internal.messages.updateStreamingMessage, {
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

      async function waitForSave() {
        if (pendingSave)
          await sleep(1000)
        if (pendingSave)
          await sleep(5000)
        if (pendingSave)
          console.error('Save was stuck')
      }

      // Create streaming response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
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

            const aiStream = streamText({
              model: getAgentModel({ provider, model, apiKey }),
              system: 'You are inside a chat room of multiple users and multiple agents, previous messages contexts (if present), will have an auto-added `SC` (System Context) header, which contains metadata info of each message, for example: which agent or which user sent the message, etc..., You can use it for context.\nIMPORTANT: NEVER response / add / include the `SC` header in your response, it will be automatically added later.',
              messages: messagesContext,
              onError: (ev) => {
                console.error(ev.error)
                throw ev.error
              },
            })

            for await (const textDelta of aiStream.textStream) {
              if (textDelta) {
                aiResponse += textDelta
                controller.enqueue(encoder.encode(`t: ${textDelta}`))

                doSave()
              }
            }

            // Finish streaming
            await waitForSave()
            await c.env.runMutation(internal.messages.finishStreaming, { streamId })
            await c.env.runMutation(internal.threads.updateThreadInfo, { threadId, timestamp: Date.now() })

            // // Generate new thread title
            // await c.env.runAction(api.threads.generateTitle, { threadId, lockerKey, apiKey })

            controller.enqueue(encoder.encode(`o: ${JSON.stringify({ done: true })}\n`))
            controller.close()
          }
          catch (error: any) {
            console.error(error)

            aiResponse += `\n\nError encountered, stream stopped`

            doSave()
            await waitForSave()
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
