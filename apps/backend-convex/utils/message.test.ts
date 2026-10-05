import type { Doc } from '../convex/_generated/dataModel'
import { describe, expect, it } from 'vitest'
import { buildAiSdkMessage } from './message'

/** Minimal stored-message factory; only the fields the builder reads. */
function stored(overrides: Partial<Doc<'messages'>>): Doc<'messages'> {
  return {
    _id: 'm1',
    _creationTime: 0,
    threadId: 't1',
    role: 'assistant',
    timestamp: 0,
    content: '',
    provider: 'hosted',
    model: 'openrouter/free',
    ...overrides,
  } as Doc<'messages'>
}

describe('buildAiSdkMessage', () => {
  it('builds a plain user message', () => {
    const [message] = buildAiSdkMessage(stored({ role: 'user', content: 'hello' }))

    expect(message).toMatchObject({ role: 'user' })
    expect(String((message as { content: string }).content)).toContain('hello')
  })

  it('builds a plain assistant message as text', () => {
    const [message] = buildAiSdkMessage(stored({ content: 'hi there' }))

    expect(message!.role).toBe('assistant')
    expect((message as { content: unknown[] }).content).toEqual([
      { type: 'text', text: expect.stringContaining('hi there') },
    ])
  })

  it('replays a completed tool call as a tool-call plus its matching tool result', () => {
    const messages = buildAiSdkMessage(stored({
      content: 'let me check',
      toolInvocations: [{ id: 'call-1', name: 'getCurrentTime', input: { tz: 'UTC' }, output: '12:00', state: 'result' }],
    }))

    expect(messages).toHaveLength(2)
    expect((messages[0] as { content: unknown[] }).content).toEqual([
      { type: 'text', text: expect.stringContaining('let me check') },
      { type: 'tool-call', toolCallId: 'call-1', toolName: 'getCurrentTime', input: { tz: 'UTC' } },
    ])
    expect(messages[1]).toEqual({
      role: 'tool',
      content: [{
        type: 'tool-result',
        toolCallId: 'call-1',
        toolName: 'getCurrentTime',
        output: { type: 'json', value: '12:00' },
      }],
    })
  })

  it('maps a failed tool call to an error output', () => {
    const messages = buildAiSdkMessage(stored({
      toolInvocations: [{ id: 'call-2', name: 'calculate', input: {}, error: 'divide by zero', state: 'error' }],
    }))

    expect((messages[1] as { content: { output: unknown }[] }).content[0]!.output).toEqual({
      type: 'error-text',
      value: 'divide by zero',
    })
  })

  it('omits an unfinished tool call, which would have no result to pair with', () => {
    const messages = buildAiSdkMessage(stored({
      content: 'thinking',
      toolInvocations: [{ id: 'call-3', name: 'calculate', input: {}, state: 'call' }],
    }))

    // A `tool-call` without its result is rejected by providers, so only the text remains.
    expect(messages).toHaveLength(1)
    expect((messages[0] as { content: unknown[] }).content).toEqual([
      { type: 'text', text: expect.stringContaining('thinking') },
    ])
  })

  it('drops a turn that would otherwise be empty', () => {
    expect(buildAiSdkMessage(stored({ content: '', toolInvocations: [] }))).toEqual([])
  })
})
