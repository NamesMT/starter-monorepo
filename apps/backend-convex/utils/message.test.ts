import type { Doc } from '../convex/_generated/dataModel'
import { describe, expect, it } from 'vitest'
import { buildMetadataHeader, buildModelMessages, historyBeforeMessage, toUiMessage } from './message'

/** Minimal stored-message factory; only the fields the builder reads. */
function stored(overrides: Partial<Doc<'messages'>>): Doc<'messages'> {
  return {
    _id: 'm1',
    _creationTime: 0,
    threadId: 't1',
    role: 'assistant',
    timestamp: 0,
    parts: [],
    provider: 'hosted',
    model: 'openrouter/free',
    ...overrides,
  } as Doc<'messages'>
}

describe('buildMetadataHeader', () => {
  it('describes a user message with its attribution', () => {
    const header = buildMetadataHeader(stored({ role: 'user', context: { from: 'Ann', uid: 'u1' } }))

    expect(header).toContain('MID: "m1"')
    expect(header).toContain('Nickname: "Ann"')
    expect(header).toContain('UID: "u1"')
  })

  it('describes an assistant message by the model that produced it', () => {
    const header = buildMetadataHeader(stored({ provider: 'openai', model: 'gpt' }))

    expect(header).toContain('From: "openai/gpt"')
  })

  it('flags a reply that is still streaming', () => {
    expect(buildMetadataHeader(stored({ isStreaming: true }))).toContain('still streaming')
  })
})

describe('toUiMessage', () => {
  it('carries parts through in order', () => {
    const message = toUiMessage(stored({
      parts: [
        { type: 'text', text: 'hi' },
        { type: 'dynamic-tool', toolName: 'calc', toolCallId: 'c1', state: 'output-available', output: 2 },
        { type: 'text', text: 'after' },
      ],
    }))

    expect(message.parts.map(part => part.type)).toEqual(['text', 'dynamic-tool', 'text'])
  })

  it('prefixes the header onto the first text part', () => {
    const message = toUiMessage(stored({ parts: [{ type: 'text', text: 'body' }] }), 'HEADER')

    expect((message.parts[0] as { text: string }).text).toBe('HEADER\nbody')
  })

  it('adds a text part for the header when a message has no text', () => {
    const message = toUiMessage(stored({ parts: [] }), 'HEADER')

    expect(message.parts).toEqual([{ type: 'text', text: 'HEADER' }])
  })
})

describe('buildModelMessages', () => {
  it('maps a text-only turn to a single model message', async () => {
    const messages = await buildModelMessages([
      stored({ role: 'user', parts: [{ type: 'text', text: 'hello' }] }),
    ])

    expect(messages).toHaveLength(1)
    expect(messages[0]!.role).toBe('user')
  })

  it('pairs a completed tool call with its own result', async () => {
    const messages = await buildModelMessages([
      stored({ role: 'user', parts: [{ type: 'text', text: 'compute' }] }),
      stored({
        role: 'assistant',
        parts: [
          { type: 'text', text: 'checking' },
          { type: 'dynamic-tool', toolName: 'calc', toolCallId: 'c1', state: 'output-available', input: { a: 1 }, output: 2 },
        ],
      }),
    ])

    const toolResult = messages.find(message => message.role === 'tool')

    expect(toolResult).toBeDefined()
    expect(JSON.stringify(toolResult)).toContain('c1')
  })

  it('drops a tool call that never produced a result rather than sending invalid input', async () => {
    const withIncomplete = await buildModelMessages([
      stored({
        role: 'assistant',
        parts: [
          { type: 'text', text: 'trying' },
          { type: 'dynamic-tool', toolName: 'calc', toolCallId: 'c9', state: 'input-available', input: {} },
        ],
      }),
    ])

    expect(withIncomplete.some(message => message.role === 'tool')).toBe(false)
  })
})

describe('historyBeforeMessage', () => {
  const history = [
    { _id: 'u1', role: 'user' },
    { _id: 'a1', role: 'assistant' },
    { _id: 'u2', role: 'user' },
    { _id: 'a2', role: 'assistant' },
  ]

  it('drops the target and everything after it', () => {
    // Regenerating a1 must answer u1, not the later "u2" turn.
    expect(historyBeforeMessage(history, 'a1').map(m => m._id)).toEqual(['u1'])
  })

  it('keeps the whole history before the last reply', () => {
    expect(historyBeforeMessage(history, 'a2').map(m => m._id)).toEqual(['u1', 'a1', 'u2'])
  })

  it('returns the history unchanged when the target is unknown', () => {
    expect(historyBeforeMessage(history, 'missing')).toHaveLength(4)
  })

  it('does not mutate its input', () => {
    const snapshot = structuredClone(history)
    historyBeforeMessage(history, 'a1')

    expect(history).toEqual(snapshot)
  })
})
