import type { Message } from '@ai-sdk/vue'
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type { ConvexClient, ConvexHttpClient } from 'convex/browser'
import { api } from 'backend-convex/convex/_generated/api'

export interface CreateNewThreadArgs {
  title: string
  lockerKey?: string
}
export async function createNewThread(convex: ConvexClient | ConvexHttpClient, {
  title,
  lockerKey,
}: CreateNewThreadArgs) {
  const newThreadId = await convex.mutation(api.threads.create, {
    title: `${title.substring(0, 20)}...`,
    initSessionId: `session_${Date.now()}`,
    lockerKey,
  })

  return newThreadId
}

export async function deleteThread(convex: ConvexClient | ConvexHttpClient, threadId: Id<'threads'>) {
  await convex.mutation(api.threads.del, {
    threadId,
  })
}

export interface CustomMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  streamId?: string
}
// Extending from AI SDK causes lag and infinite deep, using this to check compatibility instead
export type _AISDKMessageCompatCheck = CustomMessage & Message

export function customMessageTransform(message: Doc<'messages'>): CustomMessage {
  return {
    id: message._id,
    role: message.role,
    content: message.content,
    isStreaming: message.isStreaming,
    streamId: message.streamId,
  }
}
