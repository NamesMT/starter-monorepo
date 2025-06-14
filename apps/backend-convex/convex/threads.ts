import type { UserIdentity } from 'convex/server'
import type { Doc } from './_generated/dataModel'
import type { GenericCtx } from './_generated/server'
import { simpleMessagesToString } from '@local/common/src/utils/aisdk'
import { clearUndefined } from '@namesmt/utils'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { ConvexError, v } from 'convex/values'
import { api, internal } from './_generated/api'
import { action, internalMutation, mutation, query } from './_generated/server'

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

// Todo: maybe rate limit
export const generateThreadTitle = action({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(api.threads.get, { threadId: args.threadId, lockerKey: args.lockerKey })

    const messages = await ctx.runQuery(api.messages.list, { threadId: args.threadId, lockerKey: args.lockerKey })

    const { text } = await generateText({
      model: openrouter('qwen/qwen3-8b:free'),
      system: `You are a helpful assistant, generating concise, informative, and clear titles for a given context, keep the generated title under 40 characters, do not use any quotes and markdown syntax.`,
      prompt: `Generate a new title for this thread, here is the previous info: \n${[
        `Title: "${thread.title}"`,
        ...(messages.length
          ? [`Messages:\n${await simpleMessagesToString(messages.map(m => ({
              id: m._id,
              role: m.role,
              content: m.content,
            })))}`]
          : []),
      ].join('\n')}`,
    })

    await ctx.runMutation(internal.threads.updateThreadInfo, {
      title: text.trim(),
      threadId: args.threadId,
      lockerKey: args.lockerKey,
    })
  },
})

export const updateThreadInfo = internalMutation({
  args: {
    threadId: v.id('threads'),
    title: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    lockerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new Error('Thread not found')

    await assertThreadAccess(ctx, { thread, lockerKey: args.lockerKey })

    await ctx.db.patch(args.threadId, {
      ...clearUndefined({
        title: args.title,
        lastMessageAt: args.lastMessageAt,
      }),
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
