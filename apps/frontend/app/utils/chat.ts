import type { Message } from '@ai-sdk/vue'
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type { ConvexClient, ConvexHttpClient } from 'convex/browser'
import { randomStr } from '@namesmt/utils'
import { api } from 'backend-convex/convex/_generated/api'
import { createContext } from 'reka-ui'

export const [useChatContext, provideSidebarContext] = createContext<{
  insaneUI: Ref<boolean>
}>('chat page')

export function useThreadIdRef() {
  // For [...all] routing the value is an array
  return useRouteParams<string>('all', undefined, { transform: { get: s => Array.isArray(s) ? s[0] : s } })
}

export interface CreateNewThreadArgs {
  title: string
  lockerKey?: string
}
export async function createNewThread(convex: ConvexClient | ConvexHttpClient, {
  title,
  lockerKey,
}: CreateNewThreadArgs) {
  const { $init } = useNuxtApp()

  const newThreadId = await convex.mutation(api.threads.create, {
    title,
    sessionId: $init.sessionId,
    lockerKey,
  })

  return newThreadId
}

export interface DeleteThreadArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function deleteThread(convex: ConvexClient | ConvexHttpClient, {
  threadId,
  lockerKey,
}: DeleteThreadArgs) {
  await convex.mutation(api.threads.del, {
    threadId,
    lockerKey,
  })
}

export interface GenerateThreadTitleArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function generateThreadTitle(convex: ConvexClient | ConvexHttpClient, {
  threadId,
  lockerKey,
}: GenerateThreadTitleArgs) {
  await convex.action(api.threads.generateThreadTitle, {
    threadId,
    lockerKey,
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

export function getRandomLockerKey() {
  return `locker_${Date.now()}_${randomStr(8)}`
}

export function setLockerKey(kid: string, lockerKey: string) {
  localStorage.setItem(`locker_${kid}`, lockerKey)
}

export function getLockerKey(kid: string) {
  return localStorage.getItem(`locker_${kid}`) ?? undefined
}
