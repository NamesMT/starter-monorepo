import type { Message } from '@ai-sdk/vue'
import type { AgentObject, AgentsSettings, HostedProvider } from '@local/common/src/chat'
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
import { createContext } from 'reka-ui'

export interface ChatContext {
  threads: Ref<Doc<'threads'>[]>
  threadsKeyed: ComputedRef<Record<Doc<'threads'>['_id'], Doc<'threads'>>>
  pinnedThreadIds: Ref<string[]>
  activeThread: ComputedRef<Doc<'threads'> | undefined>

  hostedProvider: ComputedRef<HostedProvider>
  agentsSettings: Ref<AgentsSettings>
  /**
   * The resolved active agent
   */
  activeAgent: ComputedRef<AgentObject>

  insaneUI: Ref<boolean>
  // Interface soft render key
  interfaceSRK: Ref<number>
}
export const [useChatContext, provideChatContext] = createContext<ChatContext>('chat/root')

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

/**
 * The `sendMessage` query is watched by `ChatInterface` to submit the message.
 */
export function newThreadAndSubmit(content: string) {
  navigateTo({ path: '/chat', query: { sendMessage: content } })
}

export interface PostChatStreamArgs {
  threadId: Id<'threads'>
  provider: string
  model: string
  apiKey?: string
  content?: string
  attachments?: File[]
  streamId?: string
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

  const formData = new FormData()
  for (const [key, value] of Object.entries(args)) {
    if (key === 'attachments' && value) {
      for (const file of value as File[])
        formData.append('attachments', file)
    }
    else if (value !== undefined) {
      formData.append(key, String(value))
    }
  }
  formData.append('context', JSON.stringify({ from: getChatNickname() }))
  formData.append('lockerKey', getLockerKey(args.threadId) ?? '')

  const response = await fetch(`${convexApiUrl}/api/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${$auth.token}`,
    },
    body: formData,
    signal: abortController.signal,
  })

  return { response, abortController }
}

export interface CustomMessage extends Doc<'messages'> {
  /**
   * This id should only be used for UI purpose,
   * it could be desynced and holds value of optimistic message
   */
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
