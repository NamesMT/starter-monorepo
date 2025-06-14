import { objectPick } from '@namesmt/utils'
import { ConvexError, v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { assertThreadAccess } from './threads'

export const list = query({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    return await ctx.db
      .query('messages')
      .withIndex('by_thread_and_timestamp', q =>
        q.eq('threadId', args.threadId))
      .order('asc')
      .collect()
  },
})

export const get = query({
  args: {
    messageId: v.id('messages'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message)
      throw new ConvexError('Message not found')

    const thread = await ctx.db.get(message.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    return message
  },
})

export const add = mutation({
  args: {
    threadId: v.id('threads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
    streamId: v.optional(v.string()),
    provider: v.string(),
    model: v.string(),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    return await ctx.db.insert('messages', {
      ...objectPick(args, ['threadId', 'role', 'content', 'isStreaming', 'streamId', 'provider', 'model']),
      timestamp: Date.now(),
    })
  },
})

export const updateStreamingMessage = mutation({
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

    const thread = await ctx.db.get(message.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    await ctx.db.patch(args.messageId, {
      content: args.content,
      isStreaming: args.isStreaming,
    })
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
      isStreaming: false,
    })
  },
})

export const resolveStuckStreamMessages = internalMutation({
  args: { },
  handler: async (ctx) => {
    const messages = await ctx.db
      .query('messages')
      // Get streams that are older than 15 minutes
      .withIndex('by_timestamp', q =>
        q.lte('timestamp', Date.now() - 15 * 60 * 1000))
      .filter(q => q.eq(q.field('isStreaming'), true))
      .collect()

    if (!messages.length)
      return

    for (const message of messages) {
      await ctx.db.patch(message._id, {
        isStreaming: false,
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
