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

// TODO: maybe allow threads sharing of a whole account or remove userId arg
export const listByUser = query({
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
      .withIndex('by_user_id_and_timestamp', q => q.eq('userId', userId ?? userIdentity?.subject))
      .order('desc')
      .collect()
  },
})

export const listBySessionId = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('threads')
      .withIndex('by_session_id', q => q.eq('sessionId', args.sessionId))
      .order('desc')
      .collect()
      .then(threads => threads.map(t => ({ ...t, lockerKey: undefined })))
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
    })

    await Promise.all(messages.map(async (m) => {
      await ctx.db.insert('messages', {
        ...{ ...m, _id: undefined, _creationTime: undefined },
        isStreaming: false,
        threadId: newThreadId,
      })
    }))

    return newThreadId
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
      prompt: `Generate a new title for this thread, infer the language from the info's detail, here is the structured previous info: \n${[
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
    })
  },
})

export const updateThreadInfo = internalMutation({
  args: {
    threadId: v.id('threads'),
    title: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread)
      throw new Error('Thread not found')

    await ctx.db.patch(args.threadId, {
      ...clearUndefined({
        title: args.title,
        timestamp: args.timestamp,
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
  // Check permission by other means (JWT)
  else {
    userIdentity ??= await ctx.auth.getUserIdentity()
    if (!userIdentity || (thread.userId !== userIdentity.subject)) {
      if (lockerKey)
        console.error(`"lockerKey" available but incorrect`)
      throw new ConvexError('You are not authorized to view this thread')
    }
  }
}

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query('threads').collect()
    await Promise.all(threads.map(thread => ctx.db.delete(thread._id)))
  },
})
