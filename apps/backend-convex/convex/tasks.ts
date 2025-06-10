import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { ConvexError, v } from 'convex/values'
import { components } from './_generated/api'
import { internalMutation, mutation, query } from './_generated/server'

const rateLimiter = new RateLimiter(components.rateLimiter, {
  addTask: { kind: 'token bucket', rate: 10, period: MINUTE, capacity: 3 },
})

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tasks').collect()
  },
})

export const add = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity()
    if (userIdentity === null)
      throw new ConvexError({ msg: 'Not authenticated' })

    await rateLimiter.limit(ctx, 'addTask', { key: userIdentity.subject, throws: true })

    return await ctx.db.insert('tasks', { text: args.text })
  },
})

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query('tasks').collect()
    await Promise.all(tasks.map(task => ctx.db.delete(task._id)))
  },
})
