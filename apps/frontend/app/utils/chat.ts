import type { Message } from '@ai-sdk/vue'
import type { AgentObject } from '@local/common/src/aisdk'
import type { Doc, Id } from 'backend-convex/convex/_generated/dataModel'
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
  threadsKeyed: ComputedRef<Record<Doc<'threads'>['_id'], Doc<'threads'>>>
  pinnedThreadIds: Ref<string[]>
  activeThread: ComputedRef<Doc<'threads'> | undefined>

  hostedProvider: ComputedRef<HostedProvider>
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
      context: { from: getChatNickname() },
      lockerKey: getLockerKey(args.threadId),
    }),
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
