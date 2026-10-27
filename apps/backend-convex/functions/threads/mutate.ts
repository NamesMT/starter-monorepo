import RateLimiter, { MINUTE } from '@convex-dev/rate-limiter'
import { ConvexError, v } from 'convex/values'
import { components, internal } from '../../convex/_generated/api'
import { mutation } from '../../convex/_generated/server'
import { singleShardCounter } from '../../utils/counters'
import { generateLockerKey } from '../../utils/locker-key'
import { deleteInBatches } from '../shared/batch-delete'
import { assertThreadAccess, canRotateAnonymousLockerKey } from './utils'

const rateLimiter = new RateLimiter(components.rateLimiter, {
  branchThread: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 3 },
})

export const create = mutation({
  args: {
    title: v.string(),
    sessionId: v.string(),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject

    // A guest's key is generated here, not accepted from the caller: it is this thread's only
    // credential, so its strength must not depend on the client. A signed-in thread needs none
    // until it is shared.
    const lockerKey = userId ? args.lockerKey : generateLockerKey()

    const threadId = await ctx.db.insert('threads', {
      sessionId: args.sessionId,
      title: args.title,
      timestamp: Date.now(),
      lockerKey,
      userId,
    })

    return { threadId, lockerKey }
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

    // Messages first, thread last: the other order can leave messages pointing at a missing
    // thread, which then throws "Thread not found" forever.
    const { deleted, remaining } = await deleteInBatches(
      ctx,
      ctx.db.query('messages')
        // Use this index because its likely to be cached
        .withIndex('by_thread_and_timestamp', q => q.eq('threadId', args.threadId)),
    )

    if (remaining) {
      await ctx.scheduler.runAfter(0, internal.threads.finishDelete, {
        threadId: args.threadId,
        lockerKey: args.lockerKey,
      })
      return { deleted, remaining }
    }

    await ctx.db.delete(args.threadId)
    return { deleted, remaining: 0 }
  },
})

export const branchThreadFromMessage = mutation({
  args: {
    messageId: v.id('messages'),
    sessionId: v.string(),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity()

    await rateLimiter.limit(ctx, 'branchThread', { key: userIdentity?.subject ?? args.lockerKey, throws: true })

    const message = await ctx.db.get(args.messageId)
    if (!message)
      throw new ConvexError('Message not found')

    const thread = await ctx.db.get(message.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey, userIdentity })

    const messages = await ctx.db.query('messages')
      .withIndex('by_thread_and_timestamp', q => q.eq('threadId', thread._id).lte('timestamp', message.timestamp))
      .collect()

    const lockerKey = userIdentity?.subject ? args.lockerKey : generateLockerKey()

    const newThreadId = await ctx.db.insert('threads', {
      sessionId: args.sessionId,
      title: thread.title,
      timestamp: Date.now(),
      lockerKey,
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

    return { threadId: newThreadId, lockerKey }
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

export const migrateToUser = mutation({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity()
    if (!userIdentity)
      throw new ConvexError('Not authenticated')

    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')
    if (thread.userId)
      throw new ConvexError('Thread already have an owner')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    await ctx.db.patch(args.threadId, {
      userId: userIdentity.subject,
    })
  },
})

export const setLockerKey = mutation({
  args: {
    threadId: v.id('threads'),
    /** Omit to have the server mint one; a caller-supplied key is accepted for compatibility. */
    newLockerKey: v.optional(v.string()),
    /**
     * The thread's current key, when the caller is not signed in.
     *
     * A guest has no identity to prove ownership with, so holding the key is the only proof
     * available — and for an anonymous thread the holder of the key already has every other
     * right over it, rotation included.
     */
    currentLockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    const userIdentity = await ctx.auth.getUserIdentity()

    // A claimed thread is owned by its user: an owner may set the first share key, and a
    // key holder may not take it over. Only the anonymous case falls through to key proof.
    if (thread.userId) {
      if (thread.userId !== userIdentity?.subject)
        throw new ConvexError('Only the thread owner can change its share key')
    }
    else if (!canRotateAnonymousLockerKey(thread, args.currentLockerKey)) {
      throw new ConvexError('You are not authorized to change this thread\'s share key')
    }

    const lockerKey = args.newLockerKey ?? generateLockerKey()

    await ctx.db.patch(args.threadId, { lockerKey })

    return { lockerKey }
  },
})
