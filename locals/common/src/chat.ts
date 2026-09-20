export async function simpleMessagesToString(messages: {
  id: string
  role: string
  content: string
}[]) {
  return messages.map(m => `@-- Message ID: ${m.id}\nRole: ${m.role}\nContent:\n${m.content}`).join('\n--@\n')
}

export interface AgentObject {
  provider: string
  model: string
  modelSettings?: CommonModelSettings
  apiKey?: string
}

/**
 * Generation parameters applied to a model call (issue #43 — control profiles).
 */
export interface CommonModelGenerationSettings {
  temperature?: number
  topP?: number
  maxOutputTokens?: number
}

/**
 * Per-model configuration: what the model can do (capabilities) and how it should
 * be called (generation profile, persona traits).
 */
export interface CommonModelSettings extends CommonModelGenerationSettings {
  enabled: boolean
  /** File attachment accept list; empty/undefined means the model takes no files. */
  attachments?: string[]
  /** Persona / behaviour notes appended to the system prompt (issue #44). */
  traits?: string
  /** Whether the built-in tools are offered to this model (issues #41/#42). */
  tools?: boolean
}

/**
 * A tool invocation made by the model, surfaced for display and persisted with the
 * assistant message (issues #41/#42).
 */
export interface ChatToolInvocation {
  id: string
  name: string
  input?: unknown
  output?: unknown
  error?: string
  state: 'call' | 'result' | 'error'
}

/**
 * Personal context about the user, injected into the system prompt (issue #44).
 */
export interface PersonalContext {
  /** "About you" — who the user is, their background and preferences. */
  aboutYou?: string
  /** Free-form personal custom instructions the assistant should always follow. */
  customInstructions?: string
}

export interface AgentsSettings {
  providers: {
    /**
     * Note that `hosted` will not be accessible here and not persisted to IDB
     */
    [name: string]: CommonProviderAgentsSettings
  }
  /**
   * A special string in format of `provider/model`, `model` could be empty
   * so that the default model is always used (in the future where we add multi-acounts settings link)
   *
   * Note that `selectedAgent` is not the source of truth whether
   * which model is used, bad config will fallback to default hosted model.
   */
  selectedAgent: string
  /** Personal context shared across all providers/models. */
  personalContext?: PersonalContext
}

export interface HostedProvider extends CommonProviderAgentsSettings {
  enabled: true
  default: string
}

export interface CommonProviderAgentsSettings {
  enabled: boolean
  apiKey?: string
  models: {
    [key: string]: CommonModelSettings
  }
  default?: string
}

/**
 * A file attached to a chat message. The bytes live in Convex file storage, this
 * is only the reference/metadata persisted alongside the message.
 */
export interface ChatAttachment {
  storageId: string
  name: string
  type: string
  size: number
}

/**
 * Metadata attached to the chat stream `start`/`finish` events so the client can
 * reconcile its optimistic messages with the ones the server persisted.
 */
export interface ChatStreamMetadata {
  /** Convex id of the assistant message being streamed. */
  messageId: string
  /** Convex id of the user message that triggered this stream, when known. */
  userMessageId?: string
  /** The stream session id, used for resume + dedupe. */
  streamId: string
  resuming: boolean
}

/**
 * Attachment limits, shared by the client UX validation and the server-side enforcement.
 */
export const CHAT_ATTACHMENT_LIMITS = {
  maxCount: 5,
  /** 10 MiB */
  maxFileSize: 10 * 1024 * 1024,
} as const

/**
 * Fallback attachment capabilities used when a model does not declare its own
 * `attachments` accept list. Kept deliberately conservative.
 */
export const DEFAULT_ATTACHMENT_ACCEPT = [
  'image/*',
  'application/pdf',
  'text/*',
] as const

/** Human readable file size, e.g. `1.4 MB`. */
export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0)
    return ''
  if (bytes < 1024)
    return `${bytes} B`
  const units = ['KB', 'MB', 'GB'] as const
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * Checks a file against an attachment `accept` list, which may contain exact MIME
 * types (`image/png`), MIME wildcards (`image/*`) or extensions (`.pdf`).
 */
export function matchesAttachmentAccept(type: string, name: string, accept: readonly string[]) {
  if (!accept.length)
    return true

  const lowerType = type.toLowerCase()
  const lowerName = name.toLowerCase()

  return accept.some((rawEntry) => {
    const entry = rawEntry.trim().toLowerCase()
    if (!entry)
      return false
    if (entry.startsWith('.'))
      return lowerName.endsWith(entry)
    if (entry.endsWith('/*'))
      return lowerType.startsWith(entry.slice(0, -1))
    return lowerType === entry
  })
}
