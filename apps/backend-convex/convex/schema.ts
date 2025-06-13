import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const tasksTables = {
  tasks: defineTable({
    text: v.string(),
  }),
}

const aiChatTables = {
  threads: defineTable({
    initSessionId: v.string(), // TODO: Ability to view all threads created in the same use session using this id.
    title: v.string(),
    lastMessageAt: v.number(),
    userId: v.optional(v.string()),
    lockerKey: v.optional(v.string()),
  })
    .index('by_last_message', ['lastMessageAt']),

  messages: defineTable({
    threadId: v.id('threads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    timestamp: v.number(),
    content: v.string(),
    streamId: v.optional(v.string()),
    isStreaming: v.optional(v.boolean()),
    provider: v.string(),
    model: v.string(),
  })
    .index('by_thread', ['threadId'])
    .index('by_thread_and_timestamp', ['threadId', 'timestamp'])
    .index('by_stream_id', ['streamId']),
}

export default defineSchema({
  ...tasksTables,
  ...aiChatTables,
})
