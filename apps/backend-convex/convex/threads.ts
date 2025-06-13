import type { UserIdentity } from 'convex/server'
import type { Doc } from './_generated/dataModel'
import type { GenericCtx } from './_generated/server'
import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

export const list = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = args
    const userIdentity = await ctx.auth.getUserIdentity()

    if (!userId && !userIdentity)
      throw new ConvexError('This endpoint is only for authenticated users')

    if (userId && userId !== userIdentity?.subject)
      throw new ConvexError('You are not authorized to list threads of this user')

    return await ctx.db
      .query('threads')
      .withIndex('by_last_message', q => q)
      .order('desc')
      .take(50)
  },
})

export const get = query({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    return thread
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    initSessionId: v.string(),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('threads', {
      initSessionId: args.initSessionId,
      title: args.title,
      lastMessageAt: Date.now(),
      lockerKey: args.lockerKey,
      userId: (await ctx.auth.getUserIdentity())?.subject,
    })
  },
})

export const del = mutation({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new ConvexError('Thread not found')

    await assertThreadAccess(ctx, { thread })

    await ctx.db.delete(args.threadId)
  },
})

export const updateLastMessage = mutation({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new Error('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    await ctx.db.patch(args.threadId, {
      lastMessageAt: Date.now(),
    })
  },
})

export interface AssertThreadAccessArgs {
  thread: Doc<'threads'>
  lockerKey?: Doc<'threads'>['lockerKey']
  userIdentity?: UserIdentity | null
}
export async function assertThreadAccess(ctx: GenericCtx, { thread, lockerKey, userIdentity }: AssertThreadAccessArgs) {
  // Check permission by lockerKey
  if (lockerKey && thread.lockerKey === lockerKey) {
    ;
  }
  // Check permission other means
  else {
    userIdentity ??= await ctx.auth.getUserIdentity()
    if (!userIdentity || (thread.userId !== userIdentity.subject))
      throw new ConvexError('You are not authorized to view this thread')
  }
}

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query('threads').collect()
    await Promise.all(threads.map(thread => ctx.db.delete(thread._id)))
  },
})
