import type { ChatPart } from './chat'
import { describe, expect, it } from 'vitest'
import { getMessageText } from './chat'
import { applyStreamChunk, readStreamMetadata } from './chatStream'

/** Feeds a list of chunks into a fresh parts array, returning it. */
function accumulate(...chunks: Parameters<typeof applyStreamChunk>[1][]): ChatPart[] {
  const parts: ChatPart[] = []
  for (const chunk of chunks)
    applyStreamChunk(parts, chunk)

  return parts
}

describe('readStreamMetadata', () => {
  it('extracts the reconciliation ids from a start chunk', () => {
    const patch = readStreamMetadata({
      type: 'start',
      messageMetadata: { messageId: 'm1', userMessageId: 'u1', streamId: 's1', resuming: false },
    })

    expect(patch).toEqual({ messageId: 'm1', userMessageId: 'u1', streamId: 's1' })
  })

  it('reads message-metadata chunks too, since ids can arrive on either', () => {
    expect(readStreamMetadata({ type: 'message-metadata', messageMetadata: { messageId: 'm2' } }))
      .toEqual({ messageId: 'm2' })
  })

  it('ignores chunks that carry no metadata', () => {
    expect(readStreamMetadata({ type: 'text-delta', delta: 'hi' })).toEqual({})
    expect(readStreamMetadata({ type: 'start' })).toEqual({})
    expect(readStreamMetadata({ type: 'message-metadata', messageMetadata: null })).toEqual({})
  })

  it('omits ids that are absent rather than inventing empty strings', () => {
    const patch = readStreamMetadata({ type: 'start', messageMetadata: { streamId: 's1' } })

    expect(patch).toEqual({ streamId: 's1' })
    expect('messageId' in patch).toBe(false)
  })
})

describe('applyStreamChunk', () => {
  it('coalesces streamed text deltas into one part', () => {
    const parts = accumulate(
      { type: 'text-delta', delta: 'Hel' },
      { type: 'text-delta', delta: 'lo' },
    )

    expect(parts).toEqual([{ type: 'text', text: 'Hello' }])
  })

  it('keeps reasoning separate from text', () => {
    const parts = accumulate(
      { type: 'reasoning-delta', delta: 'thinking' },
      { type: 'text-delta', delta: 'answer' },
    )

    expect(parts.map(p => p.type)).toEqual(['reasoning', 'text'])
  })

  it('records step boundaries in order so a multi-step reply reproduces correctly', () => {
    const parts = accumulate(
      { type: 'start-step' },
      { type: 'text-delta', delta: 'before' },
      { type: 'tool-input-available', toolCallId: 'c1', toolName: 'calc', input: { a: 1 } },
      { type: 'tool-output-available', toolCallId: 'c1', output: 2 },
      { type: 'start-step' },
      { type: 'text-delta', delta: 'after' },
    )

    expect(parts.map(p => p.type)).toEqual(['step-start', 'text', 'dynamic-tool', 'step-start', 'text'])
    expect(getMessageText(parts)).toBe('beforeafter')
  })

  it('merges a tool result into the part created by its input chunk', () => {
    const parts = accumulate(
      { type: 'tool-input-available', toolCallId: 'c1', toolName: 'calc', input: { a: 1 } },
      { type: 'tool-output-available', toolCallId: 'c1', output: 2 },
    )

    expect(parts).toEqual([{
      type: 'dynamic-tool',
      toolCallId: 'c1',
      toolName: 'calc',
      state: 'output-available',
      input: { a: 1 },
      output: 2,
    }])
  })

  it('keeps a tool result that arrives without its input chunk', () => {
    const parts = accumulate({ type: 'tool-output-available', toolCallId: 'c9', output: 'ok' })

    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({ type: 'dynamic-tool', toolCallId: 'c9', output: 'ok' })
  })

  it('records a tool failure with its error text', () => {
    const parts = accumulate(
      { type: 'tool-input-available', toolCallId: 'c1', toolName: 'calc', input: { a: 1 } },
      { type: 'tool-output-error', toolCallId: 'c1', errorText: 'boom' },
    )

    expect(parts[0]).toMatchObject({ state: 'output-error', errorText: 'boom', input: { a: 1 } })
  })

  it('surfaces a rejected tool input instead of dropping the call', () => {
    const parts = accumulate({
      type: 'tool-input-error',
      toolCallId: 'c1',
      toolName: 'calc',
      input: { bad: true },
      errorText: 'Invalid arguments',
    })

    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({
      type: 'dynamic-tool',
      toolName: 'calc',
      state: 'output-error',
      errorText: 'Invalid arguments',
    })
  })

  it('renders a stream error as visible text', () => {
    const parts = accumulate({ type: 'text-delta', delta: 'partial' }, { type: 'error', errorText: 'rate limited' })

    expect(getMessageText(parts)).toBe('partial\n\nError: rate limited')
  })

  it('ignores chunk types it does not handle, including ones from a newer SDK', () => {
    const parts = accumulate(
      { type: 'start', messageMetadata: { messageId: 'm1' } },
      { type: 'text-start' },
      { type: 'finish' },
      { type: 'source-url' },
      { type: 'some-future-chunk-type' },
    )

    expect(parts).toEqual([])
  })

  it('ignores empty deltas without creating an empty part', () => {
    const parts = accumulate({ type: 'text-delta', delta: '' }, { type: 'reasoning-delta' })

    expect(parts).toEqual([])
  })
})
