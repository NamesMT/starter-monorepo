import { simpleMessagesToString } from '@local/common/src/chat'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { v } from 'convex/values'
import { api, internal } from '../../convex/_generated/api'
import { action } from '../../convex/_generated/server'

// Todo: maybe rate limit
export const generateTitle = action({
  args: {
    threadId: v.id('threads'),
    lockerKey: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(api.threads.get, { threadId: args.threadId, lockerKey: args.lockerKey })

    const messages = await ctx.runQuery(api.messages.listByThread, { threadId: args.threadId, lockerKey: args.lockerKey })

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
