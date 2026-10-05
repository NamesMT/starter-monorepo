import { describe, expect, it } from 'vitest'
import { getHostedProvider, HOSTED_DEFAULT_MODEL, HOSTED_MODELS, matchesAttachmentAccept, windowChatHistory } from './chat'

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
