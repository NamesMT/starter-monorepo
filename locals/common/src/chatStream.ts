import type { ChatPart, ChatStreamMetadata } from './chat'
import { appendReasoningPart, appendTextPart, upsertToolPart } from './chat'

/**
 * The subset of an AI SDK UI-message chunk the client acts on.
 *
 * Declared structurally rather than imported from `ai`: `@local/common` is kept
 * dependency-light on purpose (the consuming app provides `ai`), and the fields used here are
 * a stable part of the wire protocol. Unknown chunk types are ignored by design, so a newer
 * SDK adding chunk types cannot break an older client.
 */
export interface ChatStreamChunk {
  type: string
  delta?: string
  errorText?: string
  toolCallId?: string
  toolName?: string
  input?: unknown
  output?: unknown
  messageMetadata?: unknown
}

/** The metadata fields a stream's `start`/`message-metadata` chunk can carry. */
export interface ChatStreamMetadataPatch {
  messageId?: string
  userMessageId?: string
  streamId?: string
}

/**
 * Reads the reconciliation ids out of a `start` or `message-metadata` chunk.
 *
 * The client creates its messages optimistically, so these ids are how its local objects get
 * bound to the rows the server actually persisted; without them a later lookup misses.
 */
export function readStreamMetadata(chunk: ChatStreamChunk): ChatStreamMetadataPatch {
  if (chunk.type !== 'start' && chunk.type !== 'message-metadata')
    return {}

  const metadata = chunk.messageMetadata as Partial<ChatStreamMetadata> | undefined
  const patch: ChatStreamMetadataPatch = {}

  if (metadata?.messageId)
    patch.messageId = metadata.messageId
  if (metadata?.userMessageId)
    patch.userMessageId = metadata.userMessageId
  if (metadata?.streamId)
    patch.streamId = metadata.streamId

  return patch
}

/**
 * Applies one streamed chunk to the accumulated parts, in place.
 *
 * In place because this runs per token and rebuilding the array would make a long stream
 * quadratic; the caller is responsible for handing Vue a fresh array when it flushes.
 *
 * Extracted from the component so the client's half of the streaming protocol is unit
 * testable: every chunk-type regression here (a dropped tool result, an ignored error, a
 * mis-ordered step boundary) previously surfaced only as a UI bug.
 */
export function applyStreamChunk(parts: ChatPart[], chunk: ChatStreamChunk): void {
  switch (chunk.type) {
    case 'text-delta':
      if (chunk.delta)
        appendTextPart(parts, chunk.delta)
      break

    case 'reasoning-delta':
      if (chunk.delta)
        appendReasoningPart(parts, chunk.delta)
      break

    case 'start-step':
      parts.push({ type: 'step-start' })
      break

    case 'tool-input-available':
      upsertToolPart(parts, {
        toolCallId: chunk.toolCallId!,
        toolName: chunk.toolName,
        input: chunk.input,
        state: 'input-available',
      })
      break

    case 'tool-output-available':
      // `toolName` is absent on an output chunk; the part already exists from the input chunk.
      upsertToolPart(parts, {
        toolCallId: chunk.toolCallId!,
        output: chunk.output,
        state: 'output-available',
      })
      break

    case 'tool-output-error':
      upsertToolPart(parts, {
        toolCallId: chunk.toolCallId!,
        errorText: chunk.errorText,
        state: 'output-error',
      })
      break

    case 'tool-input-error':
      // The model produced arguments the tool's schema rejected. Previously unhandled, so the
      // call vanished from the transcript entirely instead of showing why it failed.
      upsertToolPart(parts, {
        toolCallId: chunk.toolCallId!,
        toolName: chunk.toolName,
        input: chunk.input,
        errorText: chunk.errorText,
        state: 'output-error',
      })
      break

    case 'error':
      appendTextPart(parts, `\n\nError: ${chunk.errorText}`)
      break
  }
}
