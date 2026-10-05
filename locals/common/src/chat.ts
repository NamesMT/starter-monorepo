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
 * An ordered piece of a message.
 *
 * Order is why this replaced a flat string plus a sibling tool array: text, reasoning and
 * tool calls interleave, and a separate array cannot express where a call happened.
 */
export interface ChatTextPart {
  type: 'text'
  text: string
}

export interface ChatReasoningPart {
  type: 'reasoning'
  text: string
}

/**
 * A tool call the model made.
 *
 * Modelled as the SDK's `dynamic-tool` because the offered tools are per-model settings, not
 * a fixed compile-time set, so the type cannot be the narrower `tool-${name}`.
 */
export interface ChatToolPart {
  type: 'dynamic-tool'
  toolName: string
  toolCallId: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: unknown
  output?: unknown
  errorText?: string
}

/** Marks a step boundary in a multi-step tool loop. */
export interface ChatStepStartPart {
  type: 'step-start'
}

export type ChatPart = ChatTextPart | ChatReasoningPart | ChatToolPart | ChatStepStartPart

/** Concatenated text of a message, ignoring reasoning and tool parts. */
export function getMessageText(parts: readonly ChatPart[] | undefined): string {
  if (!parts?.length)
    return ''

  return parts
    .filter((part): part is ChatTextPart => part.type === 'text')
    .map(part => part.text)
    .join('')
}

/** Concatenated reasoning text, for callers that treat thinking separately from the answer. */
export function getMessageReasoning(parts: readonly ChatPart[] | undefined): string {
  if (!parts?.length)
    return ''

  return parts
    .filter((part): part is ChatReasoningPart => part.type === 'reasoning')
    .map(part => part.text)
    .join('')
}

/**
 * Appends streamed text, continuing the trailing text part when there is one so a stream does
 * not produce one part per token.
 *
 * Mutates in place on purpose: this runs per token, so rebuilding the array would make a long
 * stream quadratic.
 */
export function appendTextPart(parts: ChatPart[], text: string): void {
  const last = parts.at(-1)

  if (last?.type === 'text') {
    last.text += text
    return
  }

  parts.push({ type: 'text', text })
}

/** Appends streamed reasoning, coalescing like {@link appendTextPart}. */
export function appendReasoningPart(parts: ChatPart[], text: string): void {
  const last = parts.at(-1)

  if (last?.type === 'reasoning') {
    last.text += text
    return
  }

  parts.push({ type: 'reasoning', text })
}

/**
 * Appends or updates the tool part for `toolCallId`.
 *
 * A tool call arrives in pieces (input, then output or an error), so parts are matched by id
 * and merged instead of appended twice.
 */
export function upsertToolPart(parts: ChatPart[], patch: Partial<ChatToolPart> & { toolCallId: string }): void {
  const existing = parts.find((part): part is ChatToolPart =>
    part.type === 'dynamic-tool' && part.toolCallId === patch.toolCallId)

  if (existing) {
    Object.assign(existing, patch)
    return
  }

  // A result chunk can arrive for a call we never saw, so fall back to a placeholder name.
  parts.push({
    type: 'dynamic-tool',
    state: 'input-available',
    toolName: 'tool',
    ...patch,
  } as ChatToolPart)
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

/**
 * The built-in hosted models, defined once so the client picker and the server's
 * capability checks cannot drift apart.
 */
export const HOSTED_MODELS: Record<string, CommonModelSettings> = {
  'openrouter/free': {
    enabled: true,
    attachments: ['image/*', 'application/pdf'],
    // Tools are opt-in per model; enable them for the hosted default.
    tools: true,
  },
}

/** The model the hosted provider falls back to, and the default selected agent. */
export const HOSTED_DEFAULT_MODEL = 'openrouter/free'

/**
 * Builds the hosted provider descriptor. A function rather than a constant so each
 * caller gets its own object to hand to reactive state.
 */
export function getHostedProvider(): HostedProvider {
  return {
    enabled: true,
    models: HOSTED_MODELS,
    default: HOSTED_DEFAULT_MODEL,
  }
}

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
 * Checks a file against an attachment `accept` list.
 *
 * An entry is an exact MIME type (`image/png`), a MIME wildcard (`image/*`),
 * the catch-all wildcard alone or with a slash (`*`), or a file extension (`.pdf`).
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
    // The catch-all wildcard, with or without the type slash.
    if (entry === '*' || entry === '*/*')
      return true
    if (entry.startsWith('.'))
      return lowerName.endsWith(entry)
    if (entry.endsWith('/*'))
      return lowerType.startsWith(entry.slice(0, -1))
    return lowerType === entry
  })
}

/**
 * Conversation history sent to the model.
 *
 * A thread is unbounded, so replaying the whole transcript every turn grows cost, latency
 * and the context window without limit. We send a window of recent messages instead.
 */
export const CHAT_HISTORY_LIMITS = {
  /** Recent messages kept in the prompt; generous enough for a coherent conversation. */
  maxMessages: 40,
} as const

/**
 * Keeps the most recent `maxMessages` as a window for the model prompt.
 *
 * The window must not start on an assistant message: Anthropic rejects that with a 400, and
 * our transcript count is odd because the in-flight assistant reply is excluded before this
 * runs, so an even window would otherwise open on a reply. Any such leading reply is dropped
 * (it is the answer to a user turn that fell outside the window, so it is the orphan).
 * Always keeps at least one message.
 */
export function windowChatHistory<T extends { role: string }>(
  messages: readonly T[],
  maxMessages: number = CHAT_HISTORY_LIMITS.maxMessages,
): T[] {
  if (!messages.length)
    return []

  const capped = Math.max(1, maxMessages)
  const window = messages.length <= capped ? [...messages] : messages.slice(-capped)

  const firstUserAt = window.findIndex(message => message.role === 'user')

  return firstUserAt > 0 ? window.slice(firstUserAt) : window
}
