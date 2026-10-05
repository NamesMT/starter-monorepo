import { clearUndefined, objectPick } from '@namesmt/utils'
import { ConvexError, v } from 'convex/values'
import { internalMutation, internalQuery } from '../../convex/_generated/server'
import { singleShardCounter } from '../../utils/counters'
import { resolveMessageParts } from '../../utils/message'
import { partValidator } from '../../utils/validators'

export const internalAdd = internalMutation({
  args: {
    threadId: v.id('threads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    parts: v.array(partValidator),
    context: v.optional(v.object({
      from: v.optional(v.string()),
      uid: v.optional(v.string()),
    })),
    isStreaming: v.optional(v.boolean()),
    streamId: v.optional(v.string()),
    provider: v.string(),
    model: v.string(),
    lockerKey: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      storageId: v.id('_storage'),
      name: v.string(),
      type: v.string(),
      size: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    await singleShardCounter.inc(ctx, `messages-in-thread_${args.threadId}`)

    return await ctx.db.insert('messages', {
      ...objectPick(args, ['threadId', 'role', 'parts', 'context', 'isStreaming', 'streamId', 'provider', 'model', 'attachments']),
      timestamp: Date.now(),
    })
  },
})

export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
    parts: v.array(partValidator),
    isStreaming: v.optional(v.boolean()),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message)
      throw new ConvexError('Message not found')

    await ctx.db.patch(args.messageId, clearUndefined({
      parts: args.parts,
      isStreaming: args.isStreaming,
    }))
  },
})

export const getStreamingMessage = internalQuery({
  args: { streamId: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query('messages')
      .withIndex('by_stream_id', q =>
        q.eq('streamId', args.streamId))
      .filter(q => q.eq(q.field('isStreaming'), true))
      .first()
    if (!message)
      return null

    const thread = await ctx.db.get(message.threadId)
    if (!thread)
      return null

    return message
  },
})

export const finishStreaming = internalMutation({
  args: { streamId: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query('messages')
      .withIndex('by_stream_id', q =>
        q.eq('streamId', args.streamId))
      .filter(q => q.eq(q.field('isStreaming'), true))
      .first()

    if (!message)
      return

    await ctx.db.patch(message._id, {
      streamId: undefined,
      isStreaming: false,
      cancelRequested: undefined,
    })
  },
})

/** Reads a message by id, for callers that already hold the id and checked access. */
export const getById = internalQuery({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => await ctx.db.get(args.messageId),
})

/** Resets an assistant reply so it can be generated again in place. */
export const restartStreamingMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      parts: [],
      isStreaming: true,
      streamId: args.streamId,
      cancelRequested: undefined,
    })
  },
})

/**
 * Polled by the running action. Looks the message up by id, not by `streamId`: a stop
 * clears `streamId` so the client stops polling too, and the action must still see the flag.
 */
export const isCancelRequested = internalQuery({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    return message?.cancelRequested === true
  },
})

export const resolveStuckStreamMessages = internalMutation({
  args: { },
  handler: async (ctx) => {
    const messages = await ctx.db
      .query('messages')
      // Get messages that are currently streaming
      .withIndex('by_stream_id', q => q.gte('streamId', ''))
      // Filter to those that are older than 10 mins
      .filter(q => q.lte(q.field('timestamp'), Date.now() - 10 * 60 * 1000))
      .collect()

    if (!messages.length)
      return

    for (const message of messages) {
      await ctx.db.patch(message._id, {
        isStreaming: false,
        streamId: undefined,
        cancelRequested: undefined,
        parts: [...resolveMessageParts(message), { type: 'text', text: '\nError: Streaming timed out' }],
      })
    }
  },
})

/**
 * Rewrites a sent user message and drops every reply that followed it, then opens a fresh
 * assistant message to answer the new text.
 *
 * Editing changes what the following turns were answering, so keeping them would leave the
 * thread contradicting itself; they are deleted rather than orphaned. Done in one mutation so
 * a reader never observes the rewritten question next to the old answer.
 */
export const editUserMessageAndRestart = internalMutation({
  args: {
    messageId: v.id('messages'),
    parts: v.array(partValidator),
    streamId: v.string(),
    provider: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.messageId)
    if (!target)
      throw new ConvexError('Message not found')
    if (target.role !== 'user')
      throw new ConvexError('Only a user message can be edited')

    // Ordered ascending by timestamp, so everything after the target is exactly the part of
    // the thread that answered the old text.
    const threadMessages = await ctx.db
      .query('messages')
      .withIndex('by_thread_and_timestamp', q => q.eq('threadId', target.threadId))
      .collect()

    const targetIndex = threadMessages.findIndex(message => message._id === args.messageId)
    if (targetIndex === -1)
      throw new ConvexError('Message not found in its thread')

    const later = threadMessages.slice(targetIndex + 1)

    for (const message of later)
      await ctx.db.delete(message._id)

    await ctx.db.patch(args.messageId, { parts: args.parts })

    const assistantMessageId = await ctx.db.insert('messages', {
      threadId: target.threadId,
      role: 'assistant',
      parts: [],
      isStreaming: true,
      streamId: args.streamId,
      provider: args.provider,
      model: args.model,
      timestamp: Date.now(),
    })

    // The deleted replies are replaced by the single one being generated.
    await singleShardCounter.add(ctx, `messages-in-thread_${target.threadId}`, 1 - later.length)

    return assistantMessageId
  },
})

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query('messages').collect()
    await Promise.all(messages.map(message => ctx.db.delete(message._id)))
  },
})
