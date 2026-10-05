import type { ChatAttachment, ChatPart, ChatStreamMetadata, PersonalContext } from '@local/common/src/chat'
import type { ModelMessage, UserContent } from 'ai'
import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import RateLimiter, { MINUTE } from '@convex-dev/rate-limiter'
import { zValidator } from '@hono/zod-validator'
import { appendReasoningPart, appendTextPart, CHAT_ATTACHMENT_LIMITS, matchesAttachmentAccept, upsertToolPart, windowChatHistory } from '@local/common/src/chat'
import { randomStr, sleep } from '@namesmt/utils'
import { createUIMessageStreamResponse, stepCountIs, streamText, toUIMessageStream } from 'ai'
import { ConvexError } from 'convex/values'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { throttle } from 'kontroll'
import { z } from 'zod'
import { getAgentModel, getModelAttachmentAccept, withProviderErrorAsText } from '../../utils/agent'
import { getErrorMessage, normalizePossibleSDKError } from '../../utils/error'
import { buildModelMessages, buildSystemPrompt, historyBeforeMessage } from '../../utils/message'
import { chatTools } from '../../utils/tools'
import { api, components, internal } from '../_generated/api'

const rateLimiter = new RateLimiter(components.rateLimiter, {
  aiChat: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 3 },
})

/** Maximum tool-calling steps per response (issue #42). */
const MAX_TOOL_STEPS = 5

/** Deep copy of plain JSON data; the Convex isolate does not guarantee `structuredClone`. */
function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/** How often a generating action checks whether the user asked it to stop. */
const CANCEL_POLL_MS = 1000

/** Attachment reference as sent by the client after uploading to Convex file storage. */
const attachmentReferenceSchema = z.object({
  storageId: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
})

type AttachmentReference = z.infer<typeof attachmentReferenceSchema>

interface ResolvedAttachment {
  meta: Omit<ChatAttachment, 'storageId'> & { storageId: Id<'_storage'> }
  data: Uint8Array
}

/**
 * Validates the client-provided attachment references against the actual stored
 * blobs and the model capabilities, returning the bytes for the model call.
 *
 * The server never trusts the client-declared size/type: those are re-derived from
 * the stored blob so a client cannot smuggle an oversized file past the limits.
 */
async function resolveAttachments(
  ctx: ActionCtx,
  attachments: AttachmentReference[],
  accept: readonly string[],
): Promise<ResolvedAttachment[]> {
  if (!attachments.length)
    return []

  if (attachments.length > CHAT_ATTACHMENT_LIMITS.maxCount)
    throw new ConvexError(`Too many attachments (max ${CHAT_ATTACHMENT_LIMITS.maxCount})`)

  const seenStorageIds = new Set<string>()
  const resolved: ResolvedAttachment[] = []

  for (const attachment of attachments) {
    if (seenStorageIds.has(attachment.storageId))
      throw new ConvexError('Duplicate attachment')
    seenStorageIds.add(attachment.storageId)

    let blob: Blob | null
    try {
      blob = await ctx.storage.get(attachment.storageId as Id<'_storage'>)
    }
    catch {
      blob = null
    }
    if (!blob)
      throw new ConvexError(`Attachment "${attachment.name}" was not found or has expired`)

    if (blob.size > CHAT_ATTACHMENT_LIMITS.maxFileSize)
      throw new ConvexError(`Attachment "${attachment.name}" exceeds the ${Math.round(CHAT_ATTACHMENT_LIMITS.maxFileSize / 1024 / 1024)} MiB limit`)

    const type = blob.type || attachment.type || 'application/octet-stream'
    if (!matchesAttachmentAccept(type, attachment.name, accept))
      throw new ConvexError(`Model does not support the type of attachment "${attachment.name}" (${type})`)

    resolved.push({
      meta: {
        storageId: attachment.storageId as Id<'_storage'>,
        name: attachment.name,
        type,
        size: blob.size,
      },
      data: new Uint8Array(await blob.arrayBuffer()),
    })
  }

  return resolved
}

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
      /**
       * JSON-encoded array of `{ storageId, name, type, size }`, produced by uploading
       * the files to the URLs issued by `api.files.generateUploadUrl`.
       */
      attachments: z.preprocess(
        (arg) => {
          if (arg === undefined || arg === null || arg === '')
            return []
          if (typeof arg === 'string') {
            try {
              return JSON.parse(arg)
            }
            catch {
              return arg
            }
          }
          return arg
        },
        z.array(attachmentReferenceSchema),
      ),
      /**
       * Per-model accept list declared by the client. Only honored for BYOK providers,
       * where the user owns the model configuration; the hosted provider's capabilities
       * stay authoritative on the server.
       */
      attachmentAccept: z.preprocess(
        (arg) => {
          if (arg === undefined || arg === null || arg === '')
            return []
          if (typeof arg === 'string') {
            try {
              return JSON.parse(arg)
            }
            catch {
              return []
            }
          }
          return arg
        },
        z.array(z.string()),
      ),
      /**
       * Generation profile + persona traits for the selected model (issues #43/#44).
       */
      modelOptions: z.preprocess(
        (arg) => {
          if (arg === undefined || arg === null || arg === '')
            return {}
          if (typeof arg === 'string') {
            try {
              return JSON.parse(arg)
            }
            catch {
              return {}
            }
          }
          return arg
        },
        z.object({
          temperature: z.optional(z.number().min(0).max(2)),
          topP: z.optional(z.number().min(0).max(1)),
          maxOutputTokens: z.optional(z.number().int().positive()),
          traits: z.optional(z.string()),
          tools: z.optional(z.boolean()),
        }),
      ),
      /**
       * Personal context about the user, injected into the system prompt (issue #44).
       */
      personalContext: z.preprocess(
        (arg) => {
          if (arg === undefined || arg === null || arg === '')
            return {}
          if (typeof arg === 'string') {
            try {
              return JSON.parse(arg)
            }
            catch {
              return {}
            }
          }
          return arg
        },
        z.object({
          aboutYou: z.optional(z.string()),
          customInstructions: z.optional(z.string()),
        }),
      ),
      streamId: z.optional(z.string()),
      context: z.optional(z.string().transform(val => JSON.parse(val))),
      resumeStreamId: z.optional(z.string()),
      /** Assistant message to regenerate in place, dropping the reply it currently holds. */
      regenerateMessageId: z.optional(z.string()),
      /**
       * User message to rewrite. The replies that followed it are dropped, since they
       * answered the old text.
       */
      editMessageId: z.optional(z.string()),
      lockerKey: z.optional(z.string()),
    }).refine(
      data => data.content !== undefined
        || data.resumeStreamId !== undefined
        || data.attachments.length > 0
        || data.regenerateMessageId !== undefined
        || data.editMessageId !== undefined,
      {
        message: `Either 'content', 'resumeStreamId', 'regenerateMessageId', 'editMessageId' or 'attachments' must be provided.`,
        path: ['content', 'resumeStreamId', 'regenerateMessageId', 'editMessageId', 'attachments'],
      },
    )),
    async (c) => {
      const {
        threadId: _threadId,
        provider,
        model,
        apiKey,
        content,
        attachments: attachmentReferences,
        attachmentAccept,
        modelOptions = {},
        personalContext = {},
        context = {},
        resumeStreamId,
        regenerateMessageId,
        editMessageId,
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
      let userMessageId: Id<'messages'> | undefined

      // Disable SSE resume, if you want SSE resume, implement a pub-sub.
      if (resumeStreamId)
        throw new ConvexError('SSE stream resume is disabled')

      // Regenerate: replay the thread without the old reply and write the new one in place.
      if (regenerateMessageId && !content) {
        if (thread.frozen)
          throw new ConvexError(`Can't regenerate in a frozen thread`)

        const target = await c.env.runQuery(internal.messages.getById, { messageId: regenerateMessageId as Id<'messages'> })
        if (!target || target.role !== 'assistant' || target.threadId !== threadId)
          throw new ConvexError('Message to regenerate not found')

        if (target.isStreaming)
          throw new ConvexError('Message is still streaming')

        streamId = `stream-${Date.now()}_${randomStr(4)}`
        streamingMessageId = target._id
        await c.env.runMutation(internal.messages.restartStreamingMessage, {
          messageId: streamingMessageId,
          streamId,
        })

        // Only the turns before this reply: it is answering the message that prompted it, so
        // including later messages would make the model reply to the newest one instead.
        const history = await c.env.runQuery(api.messages.listByThread, { threadId, lockerKey })
        const messagesContext = await buildModelMessages(
          windowChatHistory(historyBeforeMessage(history, streamingMessageId)),
        )

        return respondWithAiStream({
          ctx: c.env,
          threadId,
          lockerKey,
          provider: target.provider,
          model: target.model,
          apiKey,
          modelOptions,
          personalContext,
          messagesContext,
          streamId,
          streamingMessageId,
          userMessageId: undefined,
        })
      }

      // Edit: rewrite a user message, drop the replies that answered the old text, and
      // generate a fresh answer.
      if (editMessageId) {
        if (thread.frozen)
          throw new ConvexError(`Can't edit a message in a frozen thread`)
        if (!content)
          throw new ConvexError('Edited message must have content')

        const target = await c.env.runQuery(internal.messages.getById, { messageId: editMessageId as Id<'messages'> })
        if (!target || target.role !== 'user' || target.threadId !== threadId)
          throw new ConvexError('Message to edit not found')

        // Another reply is already in flight in this thread, so rewriting the history under it
        // would let it finish against a transcript it was not generated from.
        const current = await c.env.runQuery(api.messages.listByThread, { threadId, lockerKey })
        if (current.some(message => message.isStreaming))
          throw new ConvexError('Another message is still streaming')

        streamId = `stream-${Date.now()}_${randomStr(4)}`
        streamingMessageId = await c.env.runMutation(internal.messages.editUserMessageAndRestart, {
          messageId: target._id,
          parts: [{ type: 'text', text: content }],
          streamId,
          provider,
          model,
        })

        const history = await c.env.runQuery(api.messages.listByThread, { threadId, lockerKey })
        const messagesContext = await buildModelMessages(
          windowChatHistory(history.filter(message => message._id !== streamingMessageId)),
        )

        return respondWithAiStream({
          ctx: c.env,
          threadId,
          lockerKey,
          provider,
          model,
          apiKey,
          modelOptions,
          personalContext,
          messagesContext,
          streamId,
          streamingMessageId,
          userMessageId: target._id,
        })
      }

      // On new stream
      if (content || attachmentReferences.length > 0) {
        if (thread.frozen)
          throw new ConvexError(`Can't send new messages to frozen thread`)

        // If user provides a streamId, check if its properly unused
        if (streamId) {
          if (await c.env.runQuery(internal.messages.getStreamingMessage, { streamId }))
            throw new ConvexError('streamId is already in use')
        }
        streamId = streamId ?? `stream-${Date.now()}_${randomStr(4)}`

        // Validate attachments against the stored blobs + model capabilities before
        // persisting anything, so a rejected request leaves no trace. For BYOK models the
        // user-configured accept list is honored; the hosted model stays server-defined.
        const accept = provider === 'hosted'
          ? getModelAttachmentAccept({ provider, model })
          : (attachmentAccept.length ? attachmentAccept : getModelAttachmentAccept({ provider, model }))
        const resolvedAttachments = await resolveAttachments(c.env, attachmentReferences, accept)

        // Add user message to thread
        userMessageId = await c.env.runMutation(internal.messages.internalAdd, {
          threadId,
          role: 'user',
          parts: [{ type: 'text', text: content ?? '' }],
          context: { ...context, uid: userIdentity?.subject ?? 'N/A' },
          provider,
          model,
          lockerKey,
          attachments: resolvedAttachments.map(attachment => attachment.meta),
        })

        // Add assistant message to thread
        streamingMessageId = await c.env.runMutation(internal.messages.internalAdd, {
          threadId,
          role: 'assistant',
          parts: [],
          isStreaming: true,
          streamId,
          provider,
          model,
          lockerKey,
        })

        // Get conversation history
        const messages = await c.env.runQuery(api.messages.listByThread, { threadId, lockerKey })

        // Prepare messages for AI API, capped to a recent window so a long thread cannot
        // grow the prompt (and its cost) without bound. One stored message can expand into
        // several prompt messages (an assistant turn plus its tool results).
        const messagesContext = await buildModelMessages(
          windowChatHistory(messages.filter(msg => msg._id !== streamingMessageId)),
        )

        // Attach the files to the last (just persisted) user message.
        if (resolvedAttachments.length > 0) {
          const lastMessage = messagesContext.at(-1)

          if (lastMessage?.role === 'user') {
            const text = typeof lastMessage.content === 'string'
              ? lastMessage.content
              : (lastMessage.content.find(part => part.type === 'text') as { text?: string } | undefined)?.text ?? ''

            const userContent: UserContent = [{ type: 'text', text }]

            for (const attachment of resolvedAttachments) {
              userContent.push({
                type: 'file',
                data: attachment.data,
                mediaType: attachment.meta.type,
              })
            }
            lastMessage.content = userContent
          }
        }

        return respondWithAiStream({
          ctx: c.env,
          threadId,
          lockerKey,
          provider,
          model,
          apiKey,
          modelOptions,
          personalContext,
          messagesContext,
          streamId,
          streamingMessageId,
          userMessageId,
        })
      }
      else {
        throw new ConvexError('Unexpected')
      }
    },
  )

interface RespondWithAiStreamArgs {
  ctx: ActionCtx
  threadId: Id<'threads'>
  lockerKey?: string
  provider: string
  model: string
  apiKey?: string
  /** Generation profile + persona traits configured for the model (issues #43/#44). */
  modelOptions?: {
    temperature?: number
    topP?: number
    maxOutputTokens?: number
    traits?: string
    tools?: boolean
  }
  /** Personal context about the user (issue #44). */
  personalContext?: PersonalContext
  messagesContext: ModelMessage[]
  streamId: string
  streamingMessageId: Id<'messages'>
  userMessageId?: Id<'messages'>
}

/**
 * Runs the model call and returns the AI SDK UI message stream response.
 *
 * We consume the full `result.stream` (not `textStream`): in AI SDK v7 `textStream`
 * silently drops error parts, and a throw inside `onError` is swallowed by the SDK,
 * which used to surface as an empty assistant message. `toUIMessageStream` turns those
 * error parts into explicit `error` chunks the client can display.
 */
function respondWithAiStream({
  ctx,
  threadId,
  lockerKey,
  provider,
  model,
  apiKey,
  modelOptions = {},
  personalContext = {},
  messagesContext,
  streamId,
  streamingMessageId,
  userMessageId,
}: RespondWithAiStreamArgs) {
  // Parts accumulate in place and are persisted as-is, so text, reasoning and tool calls keep
  // their order instead of being flattened into one string plus a side array.
  const parts: ChatPart[] = []

  let pendingSave = false
  /** Set once the reply is finalized; stops the throttled save from overwriting it. */
  let settled = false
  function doSave() {
    if (settled)
      return

    pendingSave = true
    throttle(
      500,
      async () => {
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId: streamingMessageId,
          // Deep-copied so a later mutation of `parts` cannot race the in-flight save.
          parts: jsonClone(parts),
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

  // Convex actions get no abort signal, so a `stop` request is polled and turned into a
  // local abort. The interval is a floor: each poll is a Convex query, and a stop that
  // lands within it costs at most this long.
  const cancelController = new AbortController()
  let cancelTimer: ReturnType<typeof setInterval> | undefined
  function startCancelWatch() {
    cancelTimer ??= setInterval(() => {
      ctx.runQuery(internal.messages.isCancelRequested, { messageId: streamingMessageId })
        .then((requested) => {
          if (requested)
            cancelController.abort()
        })
        .catch(() => {})
    }, CANCEL_POLL_MS)
  }
  function stopCancelWatch() {
    if (cancelTimer) {
      clearInterval(cancelTimer)
      cancelTimer = undefined
    }
  }
  startCancelWatch()

  const result = streamText({
    // Provider failures are converted to normal text output, see `withProviderErrorAsText`.
    model: withProviderErrorAsText(getAgentModel({ provider, model, apiKey })),
    instructions: buildSystemPrompt({ model, modelSettings: modelOptions }, personalContext),
    messages: messagesContext,
    temperature: modelOptions.temperature,
    topP: modelOptions.topP,
    maxOutputTokens: modelOptions.maxOutputTokens,
    abortSignal: cancelController.signal,
    // Built-in tools are opt-in per model; multi-step tool loops are capped (issue #42).
    tools: modelOptions.tools ? chatTools : undefined,
    stopWhen: modelOptions.tools ? stepCountIs(MAX_TOOL_STEPS) : undefined,
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta' && chunk.text) {
        appendTextPart(parts, chunk.text)
        doSave()
        return
      }

      if (chunk.type === 'reasoning-delta' && chunk.text) {
        appendReasoningPart(parts, chunk.text)
        doSave()
        return
      }

      // A new step in a multi-step loop; the boundary is part of the reply's shape.
      if (chunk.type === 'start-step') {
        parts.push({ type: 'step-start' })
        doSave()
        return
      }

      if (chunk.type === 'tool-call') {
        upsertToolPart(parts, {
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          input: chunk.input,
          state: 'input-available',
        })
        doSave()
        return
      }

      if (chunk.type === 'tool-result') {
        upsertToolPart(parts, {
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          input: chunk.input,
          output: chunk.output,
          state: 'output-available',
        })
        doSave()
        return
      }

      if (chunk.type === 'tool-error') {
        upsertToolPart(parts, {
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          input: chunk.input,
          errorText: getErrorMessage(chunk.error as Error) ?? 'Tool call failed',
          state: 'output-error',
        })
        doSave()
      }
    },
    // Errors are surfaced as `error` parts on `result.stream`; just log them here.
    onError: ({ error }) => { console.error('[chat] model stream error:', error) },
  })

  const uiStream = toUIMessageStream({
    stream: result.stream,
    // Reasoning is persisted and streamed so thinking-capable models can show it.
    sendReasoning: true,
    // Only `start`/`finish` carry metadata. Returning it for every part made the SDK
    // emit a redundant `message-metadata` chunk after each token, bloating the stream.
    messageMetadata: ({ part }) => part.type === 'start' || part.type === 'finish'
      ? {
        messageId: streamingMessageId,
        userMessageId,
        streamId,
        resuming: false,
      } satisfies ChatStreamMetadata
      : undefined,
    onError: (error) => {
      // A user-requested stop aborts the call, which surfaces here as an abort error. It is
      // not a failure, so it is not written into the reply.
      if (cancelController.signal.aborted)
        return 'Stopped'

      const normalized = normalizePossibleSDKError(error)
      const errorMessage = getErrorMessage(normalized) ?? 'Unknown error'
      appendTextPart(parts, `\n\nError encountered, stream stopped: ${normalized?.name ? `[${normalized.name}]: ` : ''}${errorMessage}`)
      doSave()
      return errorMessage
    },
    onEnd: async () => {
      stopCancelWatch()

      // No final parts write: the throttled saves already hold the newest text, and whether a
      // reply is still streaming lives on `isStreaming` alone. Persisting a per-part `state`
      // needed a write to win a race against Convex tearing this action down as the response
      // ended, which it did not reliably do.
      settled = true
      await waitForSave()
      await ctx.runMutation(internal.messages.finishStreaming, { streamId })
      await ctx.runMutation(internal.threads.updateThreadInfo, { threadId, timestamp: Date.now() })
    },
  })

  return createUIMessageStreamResponse({
    stream: uiStream,
    headers: {
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
