import { clearUndefined, objectPick } from '@namesmt/utils'
import { ConvexError, v } from 'convex/values'
import { internalMutation, internalQuery } from '../../convex/_generated/server'
import { singleShardCounter } from '../../utils/counters'

export const internalAdd = internalMutation({
  args: {
    threadId: v.id('threads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    context: v.optional(v.object({
      from: v.optional(v.string()),
      uid: v.optional(v.string()),
    })),
    isStreaming: v.optional(v.boolean()),
    streamId: v.optional(v.string()),
    provider: v.string(),
    model: v.string(),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await singleShardCounter.inc(ctx, `messages-in-thread_${args.threadId}`)

    return await ctx.db.insert('messages', {
      ...objectPick(args, ['threadId', 'role', 'content', 'context', 'isStreaming', 'streamId', 'provider', 'model']),
      timestamp: Date.now(),
    })
  },
})

export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message)
      throw new ConvexError('Message not found')

    await ctx.db.patch(args.messageId, clearUndefined({
      content: args.content,
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
    })
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
        content: message.content += `\nError: Streaming timed out`,
      })
    }
  },
})

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query('messages').collect()
    await Promise.all(messages.map(message => ctx.db.delete(message._id)))
  },
})
