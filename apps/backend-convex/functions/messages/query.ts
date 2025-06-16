import { ConvexError, v } from 'convex/values'
import { query } from '../../convex/_generated/server'
import { singleShardCounter } from '../../utils/counters'
import { assertThreadAccess } from '../threads/utils'

export const listByThread = query({
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
      .withIndex('by_thread_and_timestamp', q => q.eq('threadId', args.threadId))
      .order('asc')
      .collect()
  },
})

export const countByThread = query({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    return await singleShardCounter.count(ctx, `messages-in-thread_${args.threadId}`)
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
