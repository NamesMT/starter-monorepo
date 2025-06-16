import { ConvexError, v } from 'convex/values'
import { mutation } from '../../convex/_generated/server'
import { singleShardCounter } from '../../utils/counters'
import { assertThreadAccess } from './utils'

export const create = mutation({
  args: {
    title: v.string(),
    sessionId: v.string(),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('threads', {
      sessionId: args.sessionId,
      title: args.title,
      timestamp: Date.now(),
      lockerKey: args.lockerKey,
      userId: (await ctx.auth.getUserIdentity())?.subject,
    })
  },
})

export const del = mutation({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    // Only allow thread to be deleted via lockerKey if its anonymous
    if (thread.userId && args.lockerKey)
      throw new ConvexError(`"lockerKey" is not allowed to use to delete a thread that is assigned to a user`)

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    await ctx.db.delete(args.threadId)
  },
})

export const branchThreadFromMessage = mutation({
  args: {
    messageId: v.id('messages'),
    sessionId: v.string(),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message)
      throw new ConvexError('Message not found')

    const thread = await ctx.db.get(message.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    const userIdentity = await ctx.auth.getUserIdentity()
    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey, userIdentity })

    const messages = await ctx.db.query('messages')
      .withIndex('by_thread_and_timestamp', q => q.eq('threadId', thread._id).lte('timestamp', message.timestamp))
      .collect()

    const newThreadId = await ctx.db.insert('threads', {
      sessionId: args.sessionId,
      title: thread.title,
      timestamp: Date.now(),
      lockerKey: args.lockerKey,
      userId: userIdentity?.subject,
      parentThread: thread._id,
    })

    await Promise.all(messages.map(async (m) => {
      await ctx.db.insert('messages', {
        ...{ ...m, _id: undefined, _creationTime: undefined },
        isStreaming: false,
        threadId: newThreadId,
      })
    }))

    await singleShardCounter.add(ctx, `messages-in-thread_${newThreadId}`, messages.length)

    return newThreadId
  },
})

export const freeze = mutation({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    await ctx.db.patch(args.threadId, {
      frozen: true,
    })
  },
})

export const unfreeze = mutation({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    await ctx.db.patch(args.threadId, {
      frozen: undefined,
    })
  },
})

export const setLockerKey = mutation({
  args: {
    threadId: v.id('threads'),
    newLockerKey: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new Error('Thread not found')

    await assertThreadAccess(ctx, { thread })

    await ctx.db.patch(args.threadId, {
      lockerKey: args.newLockerKey,
    })
  },
})
