import type { AgentObject, AgentsSettings, ChatAttachment, HostedProvider } from '@local/common/src/chat'
import type { UIMessage } from 'ai'
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
  attachments?: ChatAttachment[]
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

  // Listed explicitly rather than iterating `args`: callers spread an `AgentObject` in,
  // which also carries `modelSettings`, and `String()`-ing that posts "[object Object]".
  const textFields = ['threadId', 'provider', 'model', 'apiKey', 'content', 'streamId', 'resumeStreamId', 'finishOnly'] as const satisfies ReadonlyArray<keyof PostChatStreamArgs>
  for (const key of textFields) {
    const value = args[key]
    if (value !== undefined)
      formData.append(key, String(value))
  }

  if (args.attachments?.length)
    formData.append('attachments', JSON.stringify(args.attachments))

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

export interface UploadChatAttachmentArgs {
  uploadUrl: string
  file: File
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/**
 * Uploads a file to a Convex file storage upload URL.
 *
 * Uses `XMLHttpRequest` instead of `fetch` because only XHR exposes upload progress
 * events, which the attachment UI needs.
 */
export function uploadChatAttachment({ uploadUrl, file, onProgress, signal }: UploadChatAttachmentArgs) {
  return new Promise<ChatAttachment>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadUrl, true)
    xhr.responseType = 'json'
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

    const onAbort = () => xhr.abort()
    signal?.addEventListener('abort', onAbort, { once: true })

    const cleanup = () => signal?.removeEventListener('abort', onAbort)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded / event.total) * 100))
    })

    xhr.addEventListener('load', () => {
      cleanup()
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed with status ${xhr.status}`))
        return
      }

      const storageId = (xhr.response as { storageId?: string } | null)?.storageId
      if (!storageId) {
        reject(new Error('Upload response did not contain a storageId'))
        return
      }

      onProgress?.(100)
      resolve({
        storageId,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      })
    })

    xhr.addEventListener('error', () => {
      cleanup()
      reject(new Error('Upload failed'))
    })

    xhr.addEventListener('abort', () => {
      cleanup()
      reject(new DOMException('Upload aborted', 'AbortError'))
    })

    xhr.send(file)
  })
}

export interface CustomAttachment extends ChatAttachment {
  /**
   * Resolved storage URL from the server, or a local `blob:` object URL for
   * optimistic messages that have not been round-tripped yet.
   */
  url?: string | null
}

export interface CustomMessage extends Omit<Doc<'messages'>, 'attachments'> {
  /**
   * This id should only be used for UI purpose,
   * it could be desynced and holds value of optimistic message
   */
  id: string
  attachments?: CustomAttachment[]
}
// Extending from AI SDK causes lag and infinite deep, using this to check compatibility instead for now
export type _AISDKMessageCompatCheck = CustomMessage & UIMessage

export function customMessageTransform(message: Doc<'messages'>): CustomMessage {
  return {
    ...message,
    id: message._id,
  }
}
