import type { PostChatStreamArgs } from '../app/utils/chat/chat'
import { describe, expect, it } from 'vitest'
import { buildChatStreamForm, displayActiveAgent } from '../app/utils/chat/chat'

/**
 * These run in happy-dom, which provides `FormData`. They cover the parts of a chat turn that
 * a browser and a Nuxt instance are not needed to reason about: what the server receives.
 */

function field(form: FormData, key: string) {
  return form.get(key)
}

describe('displayActiveAgent', () => {
  it('prefixes a hosted model with `H/` so the UI does not imply a BYOK provider', () => {
    expect(displayActiveAgent({ provider: 'hosted', model: 'auto/free' } as any)).toBe('H/auto/free')
  })

  it('shows provider and model for BYOK', () => {
    expect(displayActiveAgent({ provider: 'openai', model: 'gpt-4o' } as any)).toBe('openai/gpt-4o')
  })
})

describe('buildChatStreamForm', () => {
  const base: PostChatStreamArgs = {
    threadId: 'thread_1' as PostChatStreamArgs['threadId'],
    provider: 'hosted',
    model: 'auto/free',
    content: 'hello',
  }

  it('posts the turn with the caller-supplied attribution', () => {
    const form = buildChatStreamForm(base, { nickname: 'Ann', lockerKey: 'locker_abc' })

    expect(field(form, 'threadId')).toBe('thread_1')
    expect(field(form, 'provider')).toBe('hosted')
    expect(field(form, 'model')).toBe('auto/free')
    expect(field(form, 'content')).toBe('hello')
    expect(field(form, 'context')).toBe(JSON.stringify({ from: 'Ann' }))
    expect(field(form, 'lockerKey')).toBe('locker_abc')
  })

  it('sends an empty key rather than omitting it, which the server reads as "no key"', () => {
    const form = buildChatStreamForm(base, { nickname: 'Ann' })

    expect(field(form, 'lockerKey')).toBe('')
  })

  it('omits fields that were not provided instead of posting "undefined"', () => {
    const form = buildChatStreamForm(base, { nickname: 'Ann' })

    expect(field(form, 'apiKey')).toBeNull()
    expect(field(form, 'streamId')).toBeNull()
    expect(field(form, 'attachments')).toBeNull()
    expect(field(form, 'modelOptions')).toBeNull()
  })

  it('serialises model settings and personal context as JSON', () => {
    const form = buildChatStreamForm({
      ...base,
      modelSettings: { enabled: true, temperature: 0.5, maxOutputTokens: 100 },
      personalContext: { aboutYou: 'a dev' },
    }, { nickname: 'Ann' })

    expect(JSON.parse(field(form, 'modelOptions') as string)).toEqual({
      temperature: 0.5,
      topP: undefined,
      maxOutputTokens: 100,
      traits: undefined,
      tools: undefined,
    })
    expect(JSON.parse(field(form, 'personalContext') as string)).toEqual({ aboutYou: 'a dev' })
  })

  it('does not leak a spread AgentObject\'s modelSettings into a text field', () => {
    // Callers spread `activeAgent` in, which carries `modelSettings`; stringifying it would
    // post "[object Object]" where the server expects a plain field.
    const form = buildChatStreamForm({ ...base, modelSettings: { enabled: true } } as PostChatStreamArgs, { nickname: 'Ann' })

    for (const key of ['threadId', 'provider', 'model', 'content']) {
      expect(field(form, key)).not.toContain('[object Object]')
    }
  })
})
