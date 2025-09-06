import type { UserContent } from 'ai'
import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { Doc, Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import RateLimiter, { MINUTE } from '@convex-dev/rate-limiter'
import { zValidator } from '@hono/zod-validator'
import { randomStr, sleep } from '@namesmt/utils'
import { streamText } from 'ai'
import { ConvexError } from 'convex/values'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { throttle } from 'kontroll'
import { z } from 'zod/v3'
import { getAgentModel } from '../../utils/agent'
import { getErrorMessage, normalizePossibleSDKError } from '../../utils/error'
import { buildAiSdkMessage, buildSystemPrompt } from '../../utils/message'
import { api, components, internal } from '../_generated/api'

const rateLimiter = new RateLimiter(components.rateLimiter, {
  aiChat: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 3 },
})

export const chatApp: HonoWithConvex<ActionCtx> = new Hono()
chatApp
  .use(cors())
  .post(
    '/stream',
    zValidator('form', z.object({
      threadId: z.string(),
      provider: z.string(),
      model: z.string(),
      apiKey: z.optional(z.string()),
      content: z.optional(z.string()),
      attachments: z.preprocess(
        arg => (arg === undefined ? [] : (Array.isArray(arg) ? arg : [arg])),
        z.array(z.instanceof(File)),
      ),
      streamId: z.optional(z.string()),
      context: z.optional(z.string().transform(val => JSON.parse(val))),
      resumeStreamId: z.optional(z.string()),
      finishOnly: z.optional(z.coerce.boolean()),
      lockerKey: z.optional(z.string()),
    }).refine(data => data.content !== undefined || data.resumeStreamId !== undefined || data.attachments.length > 0, {
      message: `Either 'content', 'resumeStreamId' or 'attachments' must be provided.`,
      path: ['content', 'resumeStreamId', 'attachments'],
    })),
    async (c) => {
      const {
        threadId: _threadId,
        provider,
        model,
        apiKey,
        content,
        attachments,
        context = {},
        resumeStreamId,
        finishOnly,
        lockerKey,
      } = c.req.valid('form')
      let { streamId } = c.req.valid('form')

      // getUserIdentity on HTTP Action will throw if not authenticated 🤦‍♂️
      const userIdentity = await c.env.auth.getUserIdentity().catch(() => null)

      if (userIdentity === null && !lockerKey)
        throw new ConvexError({ msg: 'Not authenticated' })

      await rateLimiter.limit(c.env, 'aiChat', { key: userIdentity?.subject ?? lockerKey, throws: true })

      // Cast type and runQuery to check for permission
      const threadId = _threadId as Id<'threads'>
      const thread = await c.env.runQuery(api.threads.get, { threadId, lockerKey })

      let streamingMessageId: Id<'messages'>
      let existingMessage: Doc<'messages'> | null = null

      // Disable SSE resume, if you want SSE resume, implement a pub-sub.
      if (resumeStreamId)
        throw new ConvexError('SSE stream resume is disabled')

      // On SSE resume
      if (resumeStreamId) {
        streamId = resumeStreamId

        // Check if there's an existing streaming message to resume
        existingMessage = await c.env.runQuery(internal.messages.getStreamingMessage, { streamId })

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
      // On new stream
      else if (content || attachments.length > 0) {
        if (thread.frozen)
          throw new ConvexError(`Can't send new messages to frozen thread`)

        // If user provides a streamId, check if its properly unused
        if (streamId) {
          if (await c.env.runQuery(internal.messages.getStreamingMessage, { streamId }))
            throw new ConvexError('streamId is already in use')
        }
        streamId = streamId ?? `stream-${Date.now()}_${randomStr(4)}`

        // Add user message to thread
        await c.env.runMutation(internal.messages.internalAdd, {
          threadId,
          role: 'user',
          content: content ?? '',
          context: { ...context, uid: userIdentity?.subject ?? 'N/A' },
          provider,
          model,
          lockerKey,
        })

        // Add assistant message to thread
        streamingMessageId = await c.env.runMutation(internal.messages.internalAdd, {
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
        .map(buildAiSdkMessage) as any[]

      // Add attachments directly to last user message for now, will design DB schema for it later.
      if (attachments.length > 0) {
        const lastMessage = messagesContext.at(-1)

        if (lastMessage?.role === 'user') {
          const newUserMessageContent: UserContent = [{ type: 'text', text: lastMessage.content as string }]

          for (const file of attachments) {
            const buffer = await file.arrayBuffer()
            newUserMessageContent.push({
              type: 'image',
              image: buffer,
            })
          }
          lastMessage.content = newUserMessageContent
        }
      }

      let aiResponse = ''

      let pendingSave = false
      function doSave() {
        pendingSave = true
        throttle(
          500,
          async () => {
            await c.env.runMutation(internal.messages.updateStreamingMessage, {
              messageId: streamingMessageId,
              content: aiResponse,
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
            // Send message's metadata first
            controller.enqueue(encoder.encode(`o: ${JSON.stringify({
              messageId: streamingMessageId,
              sessionId: streamId,
              resuming: !!existingMessage,
            })}\n`))

            const aiStream = streamText({
              model: getAgentModel({ provider, model, apiKey }),
              system: buildSystemPrompt({ provider, model }),
              messages: messagesContext,
              onError: (ev) => { throw ev.error },
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
          catch (err: any) {
            const error = normalizePossibleSDKError(err)
            const errorMessage = getErrorMessage(error) ?? ''
            console.error(error)

            aiResponse += `\n\nError encountered, stream stopped: ${error?.name ? `[${error.name}]: ` : ''}${errorMessage}`

            doSave()
            await waitForSave()
            await c.env.runMutation(internal.messages.finishStreaming, { streamId })

            controller.enqueue(encoder.encode(`o: ${JSON.stringify({ error: `\n\`\`\`\n${errorMessage}\n\`\`\`` })}\n`))
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
