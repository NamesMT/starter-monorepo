import type { Message } from '@ai-sdk/vue'
import type { AgentObject } from '@local/common/src/aisdk'
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import type { ConvexClient, ConvexHttpClient } from 'convex/browser'
import { randomStr } from '@namesmt/utils'
import { api } from 'backend-convex/convex/_generated/api'
import { createContext } from 'reka-ui'

export interface AgentsSetting {
  providers: {
    /**
     * `hosted` is here for types only, it will not be accessible via `agentsSetting` and persist to IDB
     */
    hosted?: CommonProviderAgentsSetting
    openrouter?: CommonProviderAgentsSetting
  }
  /**
   * A special string in format of `provider/model`, `model` could be empty
   * so that the default model is always used (in the future where we add multi-acounts settings link)
   *
   * Note that `selectedAgent` is not the source of truth whether
   * which model is used, bad config will fallback to default hosted model.
   */
  selectedAgent: string
}

export interface CommonProviderAgentsSetting {
  enabled: boolean
  apiKey?: string
  models: {
    [key: string]: {
      enabled: boolean
    }
  }
  default?: string
}

export interface HostedProvider {
  enabled: true
  apiKey?: string
  models: {
    [key: string]: {
      enabled: boolean
    }
  }
  default: string
}

export const [useChatContext, provideChatContext] = createContext<{
  threads: Ref<Doc<'threads'>[]>
  activeThread: ComputedRef<Doc<'threads'> | undefined>

  hostedProvider: HostedProvider
  agentsSetting: Ref<AgentsSetting>
  /**
   * The resolved active agent
   */
  activeAgent: ComputedRef<AgentObject>

  insaneUI: Ref<boolean>
  // Interface soft render key
  interfaceSRK: Ref<number>
}>('chat page')

export function displayActiveAgent(agent: AgentObject) {
  if (agent.provider === 'hosted')
    return `H/${agent.model}`
  else
    return `${agent.provider}/${agent.model}`
}

export function useThreadIdRef() {
  // For [...all] routing the value is an array
  return useRouteParams<string>('all', undefined, { transform: { get: s => Array.isArray(s) ? s[0] : s } })
}

export interface BranchThreadFromMessageArgs {
  messageId: Id<'messages'>
  sessionId?: string
  lockerKey?: string
}
export async function branchThreadFromMessage(convex: ConvexClient | ConvexHttpClient, {
  messageId,
  sessionId,
  lockerKey,
}: BranchThreadFromMessageArgs) {
  const { $init } = useNuxtApp()

  return await convex.mutation(api.threads.branchThreadFromMessage, {
    messageId,
    sessionId: sessionId ?? $init.sessionId,
    lockerKey,
  })
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

  return await convex.mutation(api.threads.create, {
    title,
    sessionId: $init.sessionId,
    lockerKey,
  })
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

export interface FreezeThreadArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function freezeThread(convex: ConvexClient | ConvexHttpClient, { threadId, lockerKey }: FreezeThreadArgs) {
  return await convex.mutation(api.threads.freeze, {
    threadId,
    lockerKey,
  })
}

export interface UnfreezeThreadArgs {
  threadId: Id<'threads'>
  lockerKey?: string
}
export async function unfreezeThread(convex: ConvexClient | ConvexHttpClient, { threadId, lockerKey }: UnfreezeThreadArgs) {
  return await convex.mutation(api.threads.unfreeze, {
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
  await convex.action(api.threads.generateTitle, {
    threadId,
    lockerKey,
  })
}

export interface ThreadSetLockerKeyArgs {
  threadId: Id<'threads'>
  newLockerKey: string
}
export async function threadSetLockerKey(convex: ConvexClient | ConvexHttpClient, {
  threadId,
  newLockerKey,
}: ThreadSetLockerKeyArgs) {
  await convex.mutation(api.threads.setLockerKey, {
    threadId,
    newLockerKey,
  })
}

export function getUserName() {
  const { $auth } = useNuxtApp()

  return localStorage.getItem('chat/user-nickname') || $auth?.user?.name || 'Anonymous'
}

export interface PostChatStreamArgs {
  threadId: Id<'threads'>
  provider: string
  model: string
  apiKey?: string
  content?: string
  resumeStreamId?: string
  finishOnly?: boolean
  abortController?: AbortController
}
export async function postChatStream(args: PostChatStreamArgs) {
  const {
    abortController = new AbortController(),
  } = args

  const { convexApiUrl } = useRuntimeConfig().public
  const { $auth } = useNuxtApp()

  const response = await fetch(`${convexApiUrl}/api/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${$auth.token}`,
    },
    body: JSON.stringify({
      ...args,
      context: { from: getUserName() },
      lockerKey: getLockerKey(args.threadId),
    }),
    signal: abortController.signal,
  })

  return { response, abortController }
}

export interface CustomMessage extends Doc<'messages'> {
  id: string
}
// Extending from AI SDK causes lag and infinite deep, using this to check compatibility instead
export type _AISDKMessageCompatCheck = CustomMessage & Message

export function customMessageTransform(message: Doc<'messages'>): CustomMessage {
  return {
    ...message,
    id: message._id,
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
