import type { ChatPart } from './chat'
import { describe, expect, it } from 'vitest'
import { appendReasoningPart, appendTextPart, getHostedFreeModel, getHostedProvider, getMessageReasoning, getMessageText, HOSTED_AUTO_MODEL, HOSTED_DEFAULT_MODEL, HOSTED_FREE_CHAIN, HOSTED_MODELS, matchesAttachmentAccept, upsertToolPart, windowChatHistory } from './chat'

describe('matchesAttachmentAccept', () => {
  it('accepts everything when the list is empty', () => {
    expect(matchesAttachmentAccept('application/zip', 'a.zip', [])).toBe(true)
  })

  it('matches an exact MIME type', () => {
    expect(matchesAttachmentAccept('application/pdf', 'a.pdf', ['application/pdf'])).toBe(true)
    expect(matchesAttachmentAccept('image/png', 'a.png', ['application/pdf'])).toBe(false)
  })

  it('matches a MIME wildcard', () => {
    expect(matchesAttachmentAccept('image/png', 'a.png', ['image/*'])).toBe(true)
    expect(matchesAttachmentAccept('application/pdf', 'a.pdf', ['image/*'])).toBe(false)
  })

  it('matches the catch-all wildcards', () => {
    expect(matchesAttachmentAccept('image/png', 'a.png', ['*/*'])).toBe(true)
    expect(matchesAttachmentAccept('application/zip', 'a.zip', ['*'])).toBe(true)
  })

  it('matches an extension regardless of case', () => {
    expect(matchesAttachmentAccept('application/octet-stream', 'a.PDF', ['.pdf'])).toBe(true)
    expect(matchesAttachmentAccept('application/octet-stream', 'a.txt', ['.pdf'])).toBe(false)
  })

  it('ignores blank entries and surrounding whitespace', () => {
    expect(matchesAttachmentAccept('image/png', 'a.png', ['', '  ', ' image/* '])).toBe(true)
    expect(matchesAttachmentAccept('image/png', 'a.png', ['', '  '])).toBe(false)
  })
})

describe('hosted provider definition', () => {
  it('exposes a default that exists in the model map', () => {
    expect(HOSTED_MODELS[HOSTED_DEFAULT_MODEL]).toBeDefined()
  })

  it('builds a descriptor matching the shared map', () => {
    const provider = getHostedProvider()

    expect(provider.enabled).toBe(true)
    expect(provider.default).toBe(HOSTED_DEFAULT_MODEL)
    expect(provider.models).toBe(HOSTED_MODELS)
  })

  it('gives each caller an independent top-level object', () => {
    expect(getHostedProvider()).not.toBe(getHostedProvider())
  })

  it('keeps a keyless member in the chain', () => {
    // Keyless capacity is the only part that survives an exhausted metered key.
    expect(HOSTED_FREE_CHAIN.some(entry => !entry.apiKeyEnv)).toBe(true)
  })

  it('gives every chain entry a unique id and a wire model id', () => {
    const ids = HOSTED_FREE_CHAIN.map(entry => entry.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of HOSTED_FREE_CHAIN) {
      expect(entry.modelId).toBeTruthy()
      expect(entry.baseURL).toMatch(/^https:\/\//)
    }
  })

  it('exposes every chain entry and the auto entry in the picker', () => {
    for (const entry of HOSTED_FREE_CHAIN)
      expect(HOSTED_MODELS[entry.id]).toBeDefined()

    expect(HOSTED_MODELS[HOSTED_AUTO_MODEL]).toBeDefined()
  })

  it('resolves a chain entry by id and nothing for an unknown id', () => {
    expect(getHostedFreeModel(HOSTED_FREE_CHAIN[0]!.id)?.modelId).toBe(HOSTED_FREE_CHAIN[0]!.modelId)
    expect(getHostedFreeModel('nope/does-not-exist')).toBeUndefined()
  })

  it('advertises no attachments on auto, since a keyless member may serve the request', () => {
    // Claiming attachments would let a user attach a file the fallback cannot read.
    expect(HOSTED_MODELS[HOSTED_AUTO_MODEL]?.attachments ?? []).toEqual([])
  })
})

describe('windowChatHistory', () => {
  /** Alternating user/assistant turns, as a real transcript is. */
  const alternating = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', id: `m${i}` }))
  const ids = (messages: { id: string }[]) => messages.map(m => m.id)

  it('returns a short history untouched', () => {
    expect(ids(windowChatHistory(alternating(3), 40))).toEqual(['m0', 'm1', 'm2'])
  })

  it('keeps only the most recent messages when trimming', () => {
    expect(ids(windowChatHistory(alternating(10), 4))).toEqual(['m6', 'm7', 'm8', 'm9'])
  })

  it('never opens the window on an assistant message', () => {
    // 41 messages ends on a user turn (the in-flight reply is excluded before this runs),
    // so an even window would otherwise start with the assistant reply it just dropped.
    const window = windowChatHistory(alternating(41), 40)

    expect(window[0]!.role).toBe('user')
    expect(window.length).toBeLessThanOrEqual(40)
  })

  it('drops a leading assistant turn rather than sending it orphaned', () => {
    const messages = [
      { role: 'assistant', id: 'orphan' },
      { role: 'user', id: 'u' },
      { role: 'assistant', id: 'a' },
    ]

    expect(ids(windowChatHistory(messages, 3))).toEqual(['u', 'a'])
  })

  it('leaves an already user-first window alone', () => {
    const messages = [{ role: 'user', id: 'u' }, { role: 'assistant', id: 'a' }]

    expect(ids(windowChatHistory(messages, 2))).toEqual(['u', 'a'])
  })

  it('does not mutate its input', () => {
    const input = alternating(10)
    const snapshot = structuredClone(input)

    windowChatHistory(input, 3)

    expect(input).toEqual(snapshot)
  })

  it('always keeps at least one message', () => {
    expect(ids(windowChatHistory(alternating(5), 0))).toEqual(['m4'])
    expect(ids(windowChatHistory(alternating(5), -1))).toEqual(['m4'])
  })

  it('handles an empty history', () => {
    expect(windowChatHistory([], 40)).toEqual([])
    expect(windowChatHistory([], 0)).toEqual([])
  })
})

describe('chat parts', () => {
  it('concatenates only text parts', () => {
    const parts: ChatPart[] = [
      { type: 'reasoning', text: 'thinking...' },
      { type: 'text', text: 'Hello' },
      { type: 'dynamic-tool', toolName: 'calc', toolCallId: 'c1', state: 'output-available' },
      { type: 'text', text: ' world' },
    ]

    expect(getMessageText(parts)).toBe('Hello world')
    expect(getMessageReasoning(parts)).toBe('thinking...')
  })

  it('projects empty text for a missing or empty list', () => {
    expect(getMessageText(undefined)).toBe('')
    expect(getMessageText([])).toBe('')
    expect(getMessageReasoning(undefined)).toBe('')
  })

  it('coalesces consecutive streamed text into one part', () => {
    const parts: ChatPart[] = []
    for (const token of ['Hel', 'lo', ' world'])
      appendTextPart(parts, token)

    expect(parts).toEqual([{ type: 'text', text: 'Hello world' }])
  })

  it('starts a new text part after a tool call, preserving order', () => {
    const parts: ChatPart[] = []
    appendTextPart(parts, 'before')
    upsertToolPart(parts, { toolCallId: 'c1', toolName: 'calc', state: 'input-available', input: { a: 1 } })
    appendTextPart(parts, 'after')

    expect(parts.map(p => p.type)).toEqual(['text', 'dynamic-tool', 'text'])
    expect(getMessageText(parts)).toBe('beforeafter')
  })

  it('merges a tool call in place when its result arrives', () => {
    const parts: ChatPart[] = []
    upsertToolPart(parts, { toolCallId: 'c1', toolName: 'calc', state: 'input-available', input: { a: 1 } })
    upsertToolPart(parts, { toolCallId: 'c1', toolName: 'calc', state: 'output-available', output: 2 })

    expect(parts).toEqual([{
      type: 'dynamic-tool',
      toolCallId: 'c1',
      toolName: 'calc',
      state: 'output-available',
      input: { a: 1 },
      output: 2,
    }])
  })

  it('keeps separate tool calls apart', () => {
    const parts: ChatPart[] = []
    upsertToolPart(parts, { toolCallId: 'c1', toolName: 'a' })
    upsertToolPart(parts, { toolCallId: 'c2', toolName: 'b' })

    expect(parts).toHaveLength(2)
  })

  it('coalesces reasoning separately from text', () => {
    const parts: ChatPart[] = []
    appendReasoningPart(parts, 'th')
    appendReasoningPart(parts, 'ink')
    appendTextPart(parts, 'answer')

    expect(getMessageReasoning(parts)).toBe('think')
    expect(getMessageText(parts)).toBe('answer')
    expect(parts.map(p => p.type)).toEqual(['reasoning', 'text'])
  })
})
