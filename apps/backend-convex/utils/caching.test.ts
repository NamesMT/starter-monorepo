import type { ModelMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import {
  cachingCallProviderOptions,
  cachingStrategyFor,
  MAX_ANTHROPIC_BREAKPOINTS,
  openAiCacheKey,
  withAnthropicCacheBreakpoints,
} from './caching'

/** A short two-turn conversation, the shape `buildModelMessages` produces. */
function conversation(): ModelMessage[] {
  return [
    { role: 'user', content: 'first question' },
    { role: 'assistant', content: 'first answer' },
    { role: 'user', content: 'second question' },
  ]
}

/** Reads the Anthropic marker off a message, if any. */
function marker(message: ModelMessage) {
  return message.providerOptions?.anthropic?.cacheControl
}

describe('cachingStrategyFor', () => {
  it('uses explicit markers for Anthropic, the only provider here that needs them', () => {
    expect(cachingStrategyFor('anthropic')).toBe('anthropic-explicit')
  })

  it('uses a cache key for OpenAI', () => {
    expect(cachingStrategyFor('openai')).toBe('openai-key')
  })

  it('leaves providers that cache implicitly untouched', () => {
    // Google and Groq cache without markers, and OpenRouter's cache_control is documented for
    // Anthropic models only while our OpenRouter traffic is a free auto-router.
    expect(cachingStrategyFor('google')).toBe('none')
    expect(cachingStrategyFor('groq')).toBe('none')
    expect(cachingStrategyFor('openrouter')).toBe('none')
  })

  it('leaves the hosted free chain untouched', () => {
    // The chain is a metered OpenRouter free model plus two keyless OpenAI-compatible
    // endpoints. None is Anthropic, so there is nothing to mark.
    expect(cachingStrategyFor('hosted')).toBe('none')
  })

  it('treats an unknown provider as uncacheable rather than guessing', () => {
    expect(cachingStrategyFor('some-new-provider')).toBe('none')
  })
})

describe('withAnthropicCacheBreakpoints', () => {
  it('marks the system instructions, which are identical on every turn', () => {
    const result = withAnthropicCacheBreakpoints({ instructions: 'SYSTEM', messages: conversation() })

    expect(result.instructions).toMatchObject({
      role: 'system',
      content: 'SYSTEM',
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    })
  })

  it('marks only the last message, so the breakpoint advances with the conversation', () => {
    const result = withAnthropicCacheBreakpoints({ instructions: 'SYSTEM', messages: conversation() })

    expect(marker(result.messages[0]!)).toBeUndefined()
    expect(marker(result.messages[1]!)).toBeUndefined()
    expect(marker(result.messages[2]!)).toEqual({ type: 'ephemeral' })
  })

  it('stays inside Anthropic\'s breakpoint ceiling', () => {
    // A marker per message would exceed the ceiling of four on a normal thread, and Anthropic
    // silently discards the excess rather than erroring.
    const long: ModelMessage[] = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `message ${i}`,
    }))

    const result = withAnthropicCacheBreakpoints({ instructions: 'SYSTEM', messages: long })
    const marked = result.messages.filter(message => marker(message)).length
    const systemMarked = typeof result.instructions === 'object' ? 1 : 0

    expect(marked).toBe(1)
    expect(marked + systemMarked).toBeLessThanOrEqual(MAX_ANTHROPIC_BREAKPOINTS)
  })

  it('preserves unrelated providerOptions already on a message', () => {
    const messages: ModelMessage[] = [{
      role: 'user',
      content: 'hi',
      providerOptions: { openai: { promptCacheKey: 'keep-me' } },
    }]

    const result = withAnthropicCacheBreakpoints({ messages })

    expect(result.messages[0]!.providerOptions).toMatchObject({
      openai: { promptCacheKey: 'keep-me' },
      anthropic: { cacheControl: { type: 'ephemeral' } },
    })
  })

  it('does not mutate its input', () => {
    const messages = conversation()
    withAnthropicCacheBreakpoints({ instructions: 'SYSTEM', messages })

    expect(messages.every(message => message.providerOptions === undefined)).toBe(true)
  })

  it('leaves an empty prompt alone', () => {
    const result = withAnthropicCacheBreakpoints({ instructions: 'SYSTEM', messages: [] })

    expect(result.messages).toEqual([])
    expect(result.instructions).toBe('SYSTEM')
  })

  it('passes through instructions that are already a system message array', () => {
    const instructions = [{ role: 'system' as const, content: 'A' }, { role: 'system' as const, content: 'B' }]
    const result = withAnthropicCacheBreakpoints({ instructions, messages: conversation() })

    expect(result.instructions).toBe(instructions)
  })
})

describe('openAiCacheKey', () => {
  it('scopes the cache key to the thread', () => {
    expect(openAiCacheKey('thread-1')).toBe('thread-1')
  })

  it('disables caching explicitly when there is no thread id', () => {
    // `-1` is OpenAI's documented "no caching" value. Falling back to a per-request key would
    // guarantee a cache miss while looking configured.
    expect(openAiCacheKey(undefined)).toBe('-1')
  })
})

describe('cachingCallProviderOptions', () => {
  it('sends the OpenAI cache key as a request setting', () => {
    expect(cachingCallProviderOptions('openai-key', 'thread-9'))
      .toEqual({ openai: { promptCacheKey: 'thread-9' } })
  })

  it('sends nothing for Anthropic, whose markers live on messages instead', () => {
    // A call-level `anthropic.cacheControl` is a different mechanism (Anthropic's automatic
    // mode, emitted as a top-level `cache_control`), not the per-message breakpoints used here.
    expect(cachingCallProviderOptions('anthropic-explicit', 'thread-9')).toBeUndefined()
  })

  it('sends nothing for uncacheable providers', () => {
    expect(cachingCallProviderOptions('none', 'thread-9')).toBeUndefined()
  })
})
